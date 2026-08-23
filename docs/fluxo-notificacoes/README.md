# Lembretes push — passo a passo de configuração

O código já está pronto e as chaves já foram geradas (`VALORES.md`). Falta só colar os valores no Render e no GitHub e ativar no celular.
Tempo total: ~5 minutos. O planejamento técnico completo está em `planejamento.md`.

---

## 1. Chaves já geradas

Os valores de produção (chaves VAPID e `CRON_SECRET`) já estão prontos em **`VALORES.md`** nesta pasta.
Esse arquivo está no `.gitignore` — **não suba ele para o GitHub**. Se perder, gere outros:

```bash
npx web-push generate-vapid-keys --json   # chaves VAPID
openssl rand -base64 32                    # CRON_SECRET
```

---

## 2. Variáveis de ambiente na Vercel

Vercel → projeto **planfin** → **Settings → Environment Variables** → adicionar (marque *Production*; se quiser testar em preview, marque *Preview* também):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | copiar de `VALORES.md` |
| `VAPID_PRIVATE_KEY` | copiar de `VALORES.md` |
| `VAPID_SUBJECT` | copiar de `VALORES.md` |
| `CRON_SECRET` | copiar de `VALORES.md` |

Salvar e fazer um novo deploy (**Deployments → ⋯ → Redeploy**, ou só dar push). A migration `20260823140000_add_push_reminders` roda no build (`prisma migrate deploy`) contra o Postgres do Railway, como sempre.

> `NEXT_PUBLIC_VAPID_PUBLIC_KEY` é embutida **no build**, então variáveis adicionadas depois só valem após um **Redeploy**.

---

## 3. Secrets no GitHub (para o agendador)

Repositório no GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|---|---|
| `APP_URL` | URL pública do app na Vercel, sem barra no final. `https://planfin-blue.vercel.app` |
| `CRON_SECRET` | **a mesma** de `VALORES.md` |

O workflow já está em `.github/workflows/reminders.yml`. Ele roda a cada hora e chama `/api/push/run`.
Depois do push do código, confira em **Actions → Lembretes PlanFin** se aparece; você pode clicar em **Run workflow** para testar na hora.

> Se o repositório for **privado**, o GitHub Actions tem 2.000 min/mês grátis — esse job usa ~4 min/mês.

---

## 4. Ativar no celular

1. Abra o PlanFin **instalado** (ícone na tela inicial).
   - **iPhone**: obrigatório estar instalado (Safari → Compartilhar → *Adicionar à Tela de Início*). No Safari "solto" o botão nem aparece.
   - **Android**: funciona no Chrome normal ou instalado.
2. **Configurações → Lembretes de vencimento → Ativar notificações neste aparelho**.
3. Aceite a permissão de notificação.
4. Toque em **Enviar teste** — deve chegar uma notificação em segundos.
5. Ajuste, se quiser: *Véspera às* (padrão 20:00), *No dia às* (padrão 08:00), Despesas / Receitas.

Repita em cada aparelho. A lista "Aparelhos" mostra onde está ativo.

---

## 5. Como funciona depois

- **Todo dia na hora da véspera** (20h): *"Amanhã: Energia — R$ 230,00"*. Vários itens → *"Amanhã: 3 despesas — R$ 1.580,00"* com a lista no corpo. Despesas e receitas vêm em notificações separadas.
- **Todo dia na hora do dia** (8h): o mesmo para o que vence hoje.
- Só avisa itens **pendentes com data** (ajustes de saldo não contam). Marcou como pago/recebido → não avisa mais. Nada pendente → não manda nada.
- Tocar na notificação abre o PlanFin no mês certo.
- Horário pode variar ±15 min (o GitHub Actions agendado não é exato). Nunca duplica: há um registro por usuário/tipo/dia.
- Trocou de celular? Ativa no novo. O antigo é removido sozinho quando o Google/Apple responde que o endpoint morreu.

---

## 6. Testar em produção sem esperar a hora

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" "https://planfin-blue.vercel.app/api/push/run?kind=day"
curl -H "Authorization: Bearer SEU_CRON_SECRET" "https://planfin-blue.vercel.app/api/push/run?kind=eve"
```

`kind=day` força "o que vence hoje"; `kind=eve` força "o que vence amanhã". Ambos ignoram o registro anti-duplicação, então podem reenviar. A resposta é um JSON:

```json
{"hour":8,"users":1,"sent":2,"skipped":0,"removed":0}
```

- `sent` = aparelhos que receberam; `removed` = subscriptions mortas apagadas; `skipped` = já tinha enviado hoje.
- Sem o header correto a rota responde **404** (de propósito).

---

## 7. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Card diz "servidor ainda não tem as chaves VAPID" | Variáveis do passo 2 faltando, ou deploy feito antes de adicioná-las (refaça o deploy). |
| Botão "Ativar" não aparece no iPhone | App não está instalado na tela inicial, ou iOS < 16.4. |
| "Permissão não concedida" | Usuário negou. Android: Configurações do site → Notificações. iPhone: Ajustes → Notificações → PlanFin. |
| "Enviar teste" diz `sent: 0` | Nenhuma subscription válida — desative e ative de novo no aparelho. |
| Workflow do GitHub falha com 404 | `CRON_SECRET` do GitHub diferente do da Vercel, ou `APP_URL` errada. |
| Workflow falha com timeout | Função serverless demorando (muitos usuários/aparelhos). O `curl` tenta 3×; se persistir, aumente `--max-time`. A rota já declara `maxDuration = 60`. |
| Rota `/api/push/run` dá 504 na Vercel | Estourou os 60 s (`maxDuration`). Para uso pessoal não acontece; se crescer, plano Pro permite mais. |
| Notificação atrasa 10–15 min | Normal: GitHub Actions agendado não é exato. |

---

## 8. O que foi implementado (referência)

| Arquivo | Função |
|---|---|
| `prisma/schema.prisma` + migration `add_push_reminders` | Tabelas `push_subscriptions`, `notification_logs`; campos `reminders_*` em `settings` |
| `public/sw.js` | Recebe o push e mostra a notificação; toque abre a URL |
| `src/lib/push.ts` | Envio via `web-push`, limpeza de endpoints mortos |
| `src/lib/reminders.ts` | Ciclo: hora atual em Fortaleza → itens pendentes de hoje/amanhã → envio → log |
| `src/app/api/push/subscribe` | POST registra aparelho / DELETE remove |
| `src/app/api/push/devices` | Lista aparelhos + chave pública |
| `src/app/api/push/test` | Notificação de teste |
| `src/app/api/push/run` | Chamada pelo agendador (protegida por `CRON_SECRET`) |
| `src/app/api/settings` (PATCH) | Preferências de horário e tipos |
| `src/components/settings/reminder-settings-card.tsx` | Card em Configurações |
| `src/middleware.ts` | Libera `/api/push/run` da exigência de sessão |
| `.github/workflows/reminders.yml` | Agendador de hora em hora |
