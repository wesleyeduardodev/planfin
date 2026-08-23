# Plano — Feed de Calendário (.ics) para lembretes de despesas e receitas

**Status:** proposta para análise (nada implementado)
**Data:** 2026-08-23
**Objetivo:** receber notificação **um dia antes** e **na manhã do dia** de cada despesa/receita com data, no Google Calendar e/ou no Calendário do iPhone, sem depender de push do PWA nem de OAuth.

---

## 1. Visão geral

O PlanFin passa a expor uma URL por usuário no formato iCalendar (`.ics`):

```
https://<app>/api/calendar/<token>.ics
```

O usuário assina essa URL uma única vez no Google Calendar e/ou no Calendário do iPhone. A partir daí os próprios calendários sincronizam o feed periodicamente e disparam as notificações que o usuário configurar (ou que vierem dentro do arquivo, no caso do iPhone).

```
PlanFin (Postgres)  ──► /api/calendar/<token>.ics  ──► Google Calendar (sincroniza ~12–24h)
                                                   └─► iPhone Calendário (sincroniza a cada 15min–1h, configurável)
```

**O que vira evento:** todo `PlanExpense` e `PlanIncome` que tenha `dueDate`, dos planos do usuário (ver regras de filtro na seção 4).

---

## 2. Por que esta opção

| Critério | Feed .ics | Web Push (PWA) | Google Calendar API |
|---|---|---|---|
| Funciona no Android | Sim | Sim | Sim |
| Funciona no iPhone | Sim | Só com app na tela inicial (iOS 16.4+) | Só via app do Google Calendar |
| Infra extra | Nenhuma | Cron job + VAPID + tabela de subscriptions | OAuth (Google Cloud) + refresh tokens |
| Esforço estimado | ~1 dia | 2–3 dias | 3–4 dias |
| Latência | Google: até 24h · iPhone: 15min–1h | Imediato | Imediato |
| Texto da notificação | Título do evento | Totalmente customizável | Título do evento |

Trade-off aceito: a latência de sincronização do Google. Itens cadastrados "em cima da hora" podem não chegar a tempo no Google; no iPhone o problema é menor.

---

## 3. Modelo de dados

Adicionar em `Settings`:

```prisma
model Settings {
  // ... campos existentes
  calendarToken     String?  @unique @map("calendar_token")
  calendarEnabled   Boolean  @default(false) @map("calendar_enabled")
  calendarIncludeIncomes Boolean @default(true)  @map("calendar_include_incomes")
  calendarIncludePaid    Boolean @default(false) @map("calendar_include_paid")
  calendarAlarmMorningHour Int   @default(8) @map("calendar_alarm_morning_hour")
}
```

- `calendarToken`: string aleatória de 32 bytes (`crypto.randomBytes(32).toString("base64url")`), gerada ao ativar. **Tratar como senha**: quem tiver o link lê os lançamentos.
- `calendarEnabled`: permite desligar sem perder o token.
- `calendarIncludeIncomes`: incluir receitas ou só despesas.
- `calendarIncludePaid`: por padrão itens já pagos/recebidos **somem** do feed (não faz sentido lembrar). Opção para manter histórico.
- `calendarAlarmMorningHour`: hora do alarme "no dia" (default 8h, fuso `America/Fortaleza`).

Migration: `add_calendar_feed` — todos os campos com default/nullable, aditiva, sem downtime.

---

## 4. Rota do feed — `GET /api/calendar/[token].ics`

### 4.1 Autenticação
- **Não usa sessão** (os calendários acessam sem cookie). A autenticação é o próprio token.
- Buscar `Settings` por `calendarToken`; se não existir ou `calendarEnabled = false` → `404` (não `401`, para não confirmar existência).
- Adicionar a rota na exclusão do `middleware.ts` (hoje ele protege tudo que não está na lista).

### 4.2 Seleção dos itens
- Planos do usuário de **mês anterior até +2 meses** (janela de 4 meses; evita feed gigante e cobre planejamento futuro).
- `PlanExpense`: `dueDate != null` e (`paidAmount < plannedAmount` ou `calendarIncludePaid`).
- `PlanIncome` (se `calendarIncludeIncomes`): `dueDate != null` e (`receivedAmount < expectedAmount` ou `calendarIncludePaid`).
- Itens `isAdjustment` **não entram** (não são eventos futuros).

### 4.3 Formato de cada evento
Eventos de **dia inteiro** (`DTSTART;VALUE=DATE`). Exemplo de despesa:

```
BEGIN:VEVENT
UID:planfin-exp-<id>@planfin
DTSTAMP:20260823T120000Z
DTSTART;VALUE=DATE:20260912
DTEND;VALUE=DATE:20260913
SUMMARY:💸 Energia — R$ 230,00
DESCRIPTION:Despesa · Período 1 · Fixo · Dinheiro\nCategoria: Moradia\nRestante: R$ 230,00\n\nAbrir: https://<app>/planejamento/2026/9
CATEGORIES:PlanFin,Despesa
LAST-MODIFIED:20260820T101500Z
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Amanhã: Energia — R$ 230,00
END:VALARM
BEGIN:VALARM
TRIGGER;VALUE=DATE-TIME:20260912T110000Z   ← 08:00 America/Fortaleza
ACTION:DISPLAY
DESCRIPTION:Hoje: Energia — R$ 230,00
END:VALARM
END:VEVENT
```

Regras:
- `UID` estável (`planfin-exp-<id>` / `planfin-inc-<id>`): editar no app atualiza o evento em vez de duplicar; apagar/pagar remove.
- `SUMMARY`: prefixo por tipo (💸 despesa / 💰 receita) + descrição + valor. Evitar texto longo — é o que aparece na notificação.
- `DESCRIPTION`: detalhes + link direto para o mês no app.
- Dois `VALARM`: `-P1D` (um dia antes, no horário padrão do calendário) e absoluto no dia às `calendarAlarmMorningHour`.
- Escapar `,` `;` `\` e quebras de linha conforme RFC 5545; dobrar linhas em 75 bytes.

### 4.4 Cabeçalho do calendário
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PlanFin//Feed//PT-BR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:PlanFin
X-WR-TIMEZONE:America/Fortaleza
X-PUBLISHED-TTL:PT1H
REFRESH-INTERVAL;VALUE=DURATION:PT1H
```

### 4.5 Resposta HTTP
- `Content-Type: text/calendar; charset=utf-8`
- `Content-Disposition: inline; filename="planfin.ics"`
- `Cache-Control: private, max-age=300`
- `ETag` = hash do conteúdo (Google e Apple usam para evitar download repetido).

### 4.6 Implementação
- Gerar o texto manualmente (é simples) ou usar a lib `ics` (npm). Recomendação: **manual**, em `src/lib/calendar-feed.ts` — sem dependência nova, controle total dos `VALARM`.
- Reusar `calcPeriodSummary`/`getPeriodLabel` só se for incluir o período na descrição.

---

## 5. Rota de gerenciamento — `/api/settings/calendar`

| Método | Ação |
|---|---|
| `GET` | Retorna `{ enabled, url, includeIncomes, includePaid, alarmMorningHour }` (url montada com `NEXTAUTH_URL`). |
| `POST` | Ativa: gera token se não houver, `enabled = true`. |
| `PUT` | Atualiza opções (`includeIncomes`, `includePaid`, `alarmMorningHour`). |
| `POST /regenerate` | Gera novo token (invalida o link antigo — usuário precisa reassinar). |
| `DELETE` | `enabled = false` (mantém token). |

Todas com sessão (`getAuthUser`), como as demais.

---

## 6. UI — Configurações

Novo card **"Lembretes no calendário"** em `src/app/(app)/configuracoes/page.tsx`, abaixo de "Períodos do Mês":

1. **Desligado**: texto explicando + botão "Ativar feed".
2. **Ligado**:
   - Campo somente leitura com a URL + botão **Copiar link**.
   - Switches: "Incluir receitas", "Manter itens já pagos".
   - Select "Alarme no dia às": 6h–12h.
   - Botões: "Gerar novo link" (com confirmação: "o link atual deixa de funcionar") e "Desativar".
   - Aviso: *"Quem tiver este link vê seus lançamentos. Não compartilhe."*
3. **Instruções em acordeão**:
   - **Google Calendar (web)**: Outras agendas → `+` → *Inscrever-se por URL* → colar link. Depois, em *Configurações da agenda → Notificações de evento de dia inteiro*, adicionar "1 dia antes" e "No dia, 08:00". (Os `VALARM` do arquivo são ignorados pelo Google; a notificação vem da configuração da agenda.)
   - **iPhone**: Ajustes → Apps → Calendário → Contas → Adicionar conta → Outra → *Adicionar calendário assinado* → colar link. Em *Remover alertas*, deixar **desligado** para os alarmes do arquivo funcionarem. Ajustar *Buscar novos dados* para 15 min ou 1 h.
   - **Android (app Google Agenda)**: só mostra agendas assinadas pela web; assinar no navegador e depois ativar a agenda "PlanFin" no app.

---

## 7. Segurança

- Token de 32 bytes aleatórios, comparação via índice `@unique` (sem timing attack relevante, mas não retornar mensagens diferentes para token inexistente vs. desativado).
- Rate limit simples por token (ex.: 60 req/h) opcional — os calendários fazem poucas requisições.
- Nunca logar a URL completa.
- Feed contém só: descrição, valor, data, tipo, categoria, período. Sem e-mail, sem saldos.
- "Gerar novo link" é a revogação.

---

## 8. Limitações conhecidas

- **Google sincroniza a cada ~12–24h** (não há como forçar). Item criado hoje para amanhã pode não notificar no Google; no iPhone normalmente chega.
- **Google ignora `VALARM`** em agendas assinadas — o usuário precisa configurar as notificações da agenda uma vez (documentado na UI).
- Eventos são de dia inteiro; não há hora de vencimento no modelo.
- Um feed por usuário (não por plano/mês).

---

## 9. Passos de implementação (ordem sugerida)

1. Schema + migration `add_calendar_feed`. *(~20 min)*
2. `src/lib/calendar-feed.ts`: builder do `.ics` (escape, folding, VALARM, UID). *(~2 h)*
3. `GET /api/calendar/[token].ics` + exclusão no `middleware.ts`. *(~1 h)*
4. `/api/settings/calendar` (GET/POST/PUT/DELETE + regenerate). *(~1 h)*
5. Card em Configurações com instruções. *(~2 h)*
6. Testes manuais: validar com `https://icalendar.org/validator.html`, assinar no Google e no iPhone, criar/pagar/apagar item e conferir atualização. *(~1 h)*

**Total estimado: ~1 dia.**

---

## 10. Evolução futura (fora deste plano)

- **Web Push pelo PWA** (notificação imediata e texto customizado) — convive com o feed.
- Incluir hora de vencimento nos lançamentos para eventos com horário.
- Feed separado só de receitas.
