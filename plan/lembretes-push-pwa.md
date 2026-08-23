# Plano — Lembretes por notificação push (PWA)

**Status:** proposta para análise (nada implementado)
**Data:** 2026-08-23
**Substitui:** o plano anterior de feed .ics (descartado por exigir configuração fora do app).

**Objetivo:** o usuário liga os lembretes **dentro do PlanFin com um toque** e passa a receber notificação do próprio app, **na véspera** e **na manhã do dia**, para cada despesa/receita pendente com data. Nada para configurar no Google, iPhone ou calendário.

---

## 1. Experiência do usuário

**Configurações → card "Lembretes"**

```
┌──────────────────────────────────────────────┐
│ 🔔 Lembretes de vencimento                   │
│                                              │
│ Receba uma notificação na véspera e na manhã │
│ do dia de cada despesa ou receita pendente.  │
│                                              │
│ [ Ativar notificações neste aparelho ]       │
└──────────────────────────────────────────────┘
```

Depois de ativado:

```
┌──────────────────────────────────────────────┐
│ 🔔 Lembretes de vencimento        ● Ativo    │
│                                              │
│ Véspera às   [ 20:00 ▾ ]                     │
│ No dia às    [ 08:00 ▾ ]                     │
│ ☑ Despesas   ☑ Receitas                      │
│                                              │
│ Aparelhos: Pixel 7 (este) · iPhone de Wesley │
│ [ Enviar teste ]   [ Desativar neste aparelho ] │
└──────────────────────────────────────────────┘
```

**A notificação** (ícone do PlanFin):

> **Amanhã: Energia — R$ 230,00**
> Período 1 · Fixo · Dinheiro
>
> *(toque abre `/planejamento/2026/9`)*

Quando há vários itens no mesmo dia, agrupa em uma só:

> **Amanhã: 3 despesas — R$ 1.580,00**
> Energia R$ 230 · Internet R$ 120 · Supermercado R$ 1.230

**Primeiro uso no iPhone:** o card detecta que não está instalado e mostra "Para receber lembretes no iPhone, adicione o PlanFin à Tela de Início (Compartilhar → Adicionar à Tela de Início) e ative por lá".

---

## 2. Como funciona por baixo

```
[Config] Ativar ──► navigator.serviceWorker.pushManager.subscribe(VAPID)
                 ──► POST /api/push/subscribe  (salva endpoint + chaves)

[Agendador] a cada hora ──► GET /api/push/run?key=CRON_SECRET
                          ──► para cada usuário com lembrete ativo:
                                • hora atual (Fortaleza) == hora "véspera"?  → itens pendentes de AMANHÃ
                                • hora atual (Fortaleza) == hora "no dia"?   → itens pendentes de HOJE
                              ──► web-push.sendNotification(subscription, payload)
                              ──► grava em NotificationLog (evita duplicar)

[Celular] sw.js recebe 'push' ──► showNotification(título, corpo, url)
          sw.js recebe 'notificationclick' ──► abre/foca a url
```

---

## 3. Modelo de dados

```prisma
model PushSubscription {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  endpoint   String   @unique
  p256dh     String
  auth       String
  userAgent  String?  @map("user_agent")   // "Pixel 7 · Chrome", para listar aparelhos
  createdAt  DateTime @default(now()) @map("created_at")
  lastUsedAt DateTime? @map("last_used_at")
  failures   Int      @default(0)          // remove após N falhas (410 Gone)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("push_subscriptions")
}

model NotificationLog {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  kind      String                      // "eve" | "day"
  targetDate DateTime @map("target_date") // dia do vencimento (meio-dia UTC)
  sentAt    DateTime @default(now()) @map("sent_at")

  @@unique([userId, kind, targetDate])  // garante 1 envio por usuário/tipo/dia
  @@map("notification_logs")
}

model Settings {
  // ... existentes
  remindersEnabled  Boolean @default(false) @map("reminders_enabled")
  reminderEveHour   Int     @default(20)    @map("reminder_eve_hour")   // véspera
  reminderDayHour   Int     @default(8)     @map("reminder_day_hour")   // no dia
  remindExpenses    Boolean @default(true)  @map("remind_expenses")
  remindIncomes     Boolean @default(true)  @map("remind_incomes")
}
```

Migration `add_push_reminders` — aditiva, sem downtime.

---

## 4. Variáveis de ambiente

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # gerada com `npx web-push generate-vapid-keys`
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:wesleyeduardo.dev@gmail.com
CRON_SECRET=...                    # openssl rand -base64 32
```

Dependência nova: `web-push` (npm).

---

## 5. Rotas da API

| Rota | Método | Sessão | Função |
|---|---|---|---|
| `/api/push/subscribe` | POST | sim | Salva/atualiza a subscription do aparelho (`endpoint`, `keys`, `userAgent`). Liga `remindersEnabled`. |
| `/api/push/subscribe` | DELETE | sim | Remove a subscription deste aparelho. Se não sobrar nenhuma, desliga `remindersEnabled`. |
| `/api/push/devices` | GET | sim | Lista aparelhos do usuário (para o card). |
| `/api/push/test` | POST | sim | Envia uma notificação de teste para este aparelho. |
| `/api/settings` | PUT | sim | (já existe) passa a aceitar os campos `reminder*`. |
| `/api/push/run` | GET | **não** — exige header `Authorization: Bearer CRON_SECRET` | Executa o ciclo de envio (seção 6). Responde `{ sent, skipped, removed }`. |

`/api/push/run` precisa ser liberada no `middleware.ts`.

---

## 6. Lógica do ciclo (`/api/push/run`)

1. `now = nowBR()` + hora atual em Fortaleza (`Intl.DateTimeFormat` com `hour`).
2. Para cada usuário com `remindersEnabled` e ≥1 subscription:
   - Se `hora == reminderEveHour` → `kind = "eve"`, `targetDate = amanhã`.
   - Se `hora == reminderDayHour` → `kind = "day"`, `targetDate = hoje`.
   - (Se nenhuma bate, pula.)
3. Se já existe `NotificationLog(userId, kind, targetDate)` → pula (idempotente; o cron pode rodar 2× na mesma hora sem duplicar).
4. Busca itens do plano do mês de `targetDate`:
   - `PlanExpense`: `dueDate == targetDate` e `paidAmount < plannedAmount` e `!isAdjustment` (se `remindExpenses`).
   - `PlanIncome`: `dueDate == targetDate` e `receivedAmount < expectedAmount` e `!isAdjustment` (se `remindIncomes`).
5. Nada pendente → grava log e não envia (evita "0 despesas").
6. Monta payload (1 item → detalhado; N itens → agrupado; despesas e receitas em notificações separadas).
7. Envia para **todas** as subscriptions do usuário. Resposta `404/410` → apaga a subscription; outro erro → `failures++` (apaga com 5).
8. Grava `NotificationLog`.

**Tolerância a atraso:** o agendador roda de hora em hora, mas pode atrasar alguns minutos (Render free dorme). Por isso a comparação é por **hora**, não por minuto, e o log garante que não repete.

---

## 7. Service worker (`public/sw.js`)

Acrescentar:

```js
self.addEventListener("push", (e) => {
  const d = e.data?.json() ?? {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: d.tag,            // "eve-2026-09-12" — substitui se reenviar
    data: { url: d.url },
  }))
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  e.waitUntil(clients.matchAll({ type: "window" }).then((list) => {
    const c = list.find((w) => "focus" in w)
    return c ? (c.navigate(e.notification.data.url), c.focus()) : clients.openWindow(e.notification.data.url)
  }))
})
```

O registro do SW já existe em `providers.tsx`.

---

## 8. Agendador (quem chama `/api/push/run` de hora em hora)

**Recomendado: GitHub Actions** (gratuito, já que o repo está no GitHub):

```yaml
# .github/workflows/reminders.yml
on:
  schedule: [{ cron: "0 * * * *" }]   # a cada hora, UTC
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://<app>.onrender.com/api/push/run
```

Alternativas: **Render Cron Job** (serviço separado, ~US$ 1/mês, mais confiável no horário) ou **cron-job.org** (gratuito, externo).

Observação: GitHub Actions agendado pode atrasar 5–15 min em horários de pico. Como o envio é "por hora", isso só desloca o lembrete de 8:00 para ~8:10.

---

## 9. UI — card em Configurações (`configuracoes/page.tsx`)

Componente `ReminderSettingsCard`:

- Detecta suporte: `"PushManager" in window && "serviceWorker" in navigator`. Sem suporte → mensagem.
- iPhone não instalado (`!window.matchMedia("(display-mode: standalone)").matches` + UA iOS) → instrução de instalar.
- Botão **Ativar**: `Notification.requestPermission()` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `POST /api/push/subscribe`.
- Permissão negada → texto explicando como reabilitar nas configurações do navegador/aparelho.
- Selects de hora (véspera 18–22h; dia 6–12h), checkboxes Despesas/Receitas → `PUT /api/settings`.
- Lista de aparelhos + **Enviar teste** + **Desativar neste aparelho**.

---

## 10. Segurança

- `/api/push/run` só com `CRON_SECRET` (comparação constante); sem ele → 404.
- Subscription sempre ligada ao `userId` da sessão; um usuário não vê/remove endpoints de outro.
- Payload contém só descrição, valor e link relativo — sem e-mail ou saldo.
- Chave privada VAPID só no servidor.

---

## 11. Limitações

- **iPhone**: exige iOS 16.4+ e o app **instalado na tela inicial**; permissão pedida de dentro do app instalado. Se o usuário remover o app, a subscription morre (o ciclo limpa ao receber 410).
- **Android**: funciona no Chrome normal e instalado. Alguns fabricantes (Xiaomi, Samsung com economia agressiva) podem atrasar notificações — fora do nosso controle.
- Lembretes só para itens **com data** e **pendentes**. Itens sem data não notificam.
- Precisão de horário: ±15 min (agendador + Render free dormindo).
- Sem histórico visível de notificações enviadas (só o log interno).

---

## 12. Passos de implementação

| # | Passo | Estimativa |
|---|---|---|
| 1 | `npm i web-push`, gerar chaves VAPID, variáveis no Render | 20 min |
| 2 | Schema + migration `add_push_reminders` | 20 min |
| 3 | `sw.js`: handlers `push` e `notificationclick` | 30 min |
| 4 | `src/lib/push.ts`: `sendToUser(userId, payload)` com limpeza de subscriptions inválidas | 1 h |
| 5 | Rotas `subscribe` (POST/DELETE), `devices`, `test` | 1 h |
| 6 | `src/lib/reminders.ts` + rota `run` (ciclo da seção 6) | 2 h |
| 7 | `ReminderSettingsCard` em Configurações | 2 h |
| 8 | Workflow do GitHub Actions + `CRON_SECRET` nos secrets | 20 min |
| 9 | Testes: ativar no Android e no iPhone instalado, "Enviar teste", forçar `run` com `workflow_dispatch` num horário configurado | 1 h |

**Total: ~1 dia e meio.**

---

## 13. Evolução futura

- Lembrete de "mês sem plano" no dia 1.
- Resumo semanal ("esta semana vencem R$ X").
- Ação rápida na notificação: "Marcar como pago" (Android suporta botões; iOS não).
