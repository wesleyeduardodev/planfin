# Landing redirect inteligente + correção do link Dashboard

## Context

Hoje é 28/04/2026. O usuário tem planos criados para Março **e** Abril/2026, mas ao entrar no sistema (em produção, `planfin-blue.vercel.app`) ele é jogado em `/planejamento/2026/3` (Março). O esperado é abrir no **mês corrente** (Abril) e só cair em outro mês se ainda não existir plano do mês corrente.

Causas:

1. **`src/app/(app)/page.tsx` está sendo pré-renderizado estaticamente no build** (Next.js 16 — Server Component puro, só usa `redirect()`, não toca `cookies()`/`headers()`/banco, então é tratado como estático). Como o build atual em produção foi feito num momento anterior (Março), o `new Date().getMonth() + 1` foi avaliado **no build** e a URL `/planejamento/2026/3` ficou "congelada" no output estático. Por isso o usuário continua caindo em Março mesmo com Abril já existindo no banco.
2. Mesmo se a rota fosse dinâmica, o redirect ainda usaria `new Date()` (timezone do servidor Vercel = UTC) em vez de `nowBR()` (`America/Fortaleza`) — risco de off-by-one perto da virada do mês.
3. O redirect também é "cego": não checa se o plano do mês corrente existe; quando não existe, joga o usuário direto na tela "Plano não encontrado" em vez de cair no mais recente — que é o que o usuário pediu como fallback.
4. **Sidebar — link "Dashboard"** (`src/components/layout/sidebar.tsx:48`) aponta para `/`, e `/` é apenas um redirect para Planejamento. Não existe página de Dashboard implementada (`src/app/(app)/` não tem subpasta `dashboard/`; só existe a API `src/app/api/dashboard/route.ts`). Fase 4 marcada como "parcial" no `CLAUDE.md`.

Resultado esperado após a correção:
- Ao entrar no sistema, o usuário cai no mês corrente (Abril), ou no plano mais recente existente caso o mês corrente não tenha plano.
- A correção sobrevive a builds futuros (rota dinâmica, sem cache de build).
- O item "Dashboard" sai da sidebar até a página existir.

## Arquivos críticos

- `src/app/(app)/page.tsx` — redirect raiz; precisa virar Server Component que consulta o banco e decide o destino.
- `src/components/layout/sidebar.tsx` — link "Dashboard" e link "Planejamento" (ambos dependem da decisão sobre Dashboard).
- `src/lib/format.ts` — já tem `nowBR()` (linhas 37–50) com timezone correto. **Reusar**, não recriar.
- `src/lib/prisma.ts` — singleton do Prisma já existe. **Reusar**.
- `src/lib/api-utils.ts` — `getAuthUser()` já existe. **Reusar**.
- `prisma/schema.prisma` — modelo `MonthlyPlan` com unique `userId_year_month`.

## Plano de implementação

### 1. Redirect inteligente e dinâmico no `(app)/page.tsx`

Transformar o arquivo em Server Component `async` **dinâmico** que:

1. Garante a rota como dinâmica adicionando `export const dynamic = "force-dynamic"` no topo do arquivo. Isso elimina o pre-render estático que está causando o bug atual em produção. (Como o componente também passa a chamar `getAuthUser()` — que lê cookies — o Next já trataria como dinâmico, mas a diretiva torna a intenção explícita e robusta.)
2. Pega `userId` da sessão via `getAuthUser()` (`src/lib/api-utils.ts`). Se não houver sessão, redireciona para `/login` (defesa em profundidade — o `middleware.ts` já protege a rota, mas é barato confirmar).
3. Calcula `{year, month}` corrente com `nowBR()` (`src/lib/format.ts`) — corrige o issue de timezone.
4. Consulta o plano do mês corrente:
   `prisma.monthlyPlan.findUnique({ where: { userId_year_month: { userId, year, month } } })`.
   - Se existir → `redirect(/planejamento/${year}/${month})`.
5. Se não existir, busca o plano mais recente:
   `prisma.monthlyPlan.findFirst({ where: { userId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] })`.
   - Se existir → `redirect(/planejamento/${plan.year}/${plan.month})`.
6. Se o usuário não tem nenhum plano → `redirect(/planejamento/${year}/${month})` (cai na tela "Plano não encontrado" do mês corrente, onde já existem os botões para gerar o primeiro plano — comportamento de primeiro acesso).

Sem necessidade de novo endpoint API: como é Server Component, a consulta vai direto no Prisma reaproveitando o singleton em `src/lib/prisma.ts`.

### 2. Sidebar — link "Planejamento"

O link de Planejamento na sidebar (`sidebar.tsx:111-114`) usa `nowBR()` direto. Vou trocá-lo para apontar para `/` — assim o redirect inteligente do passo 1 também serve o link da sidebar (clique em "Planejamento" leva ao mês corrente OU ao mais recente, conforme a regra que o usuário pediu).

Detalhe: o `isActive` (`sidebar.tsx:64-67`) trata `/planejamento` por `startsWith`, então depois de redirecionar a URL fica `/planejamento/{ano}/{mes}` e o item permanece destacado corretamente.

### 3. Link "Dashboard" — remover por ora

Decisão do usuário: como a página de Dashboard ainda não foi implementada, o item de menu sai da sidebar até que a Fase 4 seja concluída.

- Em `src/components/layout/sidebar.tsx`:
  - Remover a linha `{ href: "/", label: "Dashboard", icon: LayoutDashboard },` do array `navItems` (linha 48).
  - Remover o import `LayoutDashboard` de `lucide-react` (linha 8) — fica órfão depois da remoção.
  - Remover o branch `if (href === "/") return pathname === "/"` em `isActive` (linhas 64–67) — também órfão. O `isActive` simplifica para `return pathname.startsWith(href)`.
  - O logo do topo continua linkando para `/` (linha 87) — está correto, é o "home" da app e o redirect inteligente leva ao mês corrente/mais recente.

## Verificação

1. `npm run build && npm run start` localmente — confirmar que `/` redireciona para o mês corrente em runtime, **não** em build-time. (Para garantir que `force-dynamic` está pegando, observar que o build não emite a rota como `○ (Static)` mas como `ƒ (Dynamic)` no log do Next.)
2. Cenário "tem plano do mês corrente": com Abril/2026 já criado, entrar em `/` → deve cair em `/planejamento/2026/4` (resolve o bug reportado).
3. Cenário "não tem plano do mês corrente, mas tem anterior": apagar temporariamente o plano de Abril (ou testar com um usuário que só tem Março) → entrar em `/` → deve cair em `/planejamento/2026/3` (fallback pro mais recente).
4. Cenário "primeiro acesso": usuário sem nenhum plano → cai em `/planejamento/2026/4` na tela "Plano não encontrado", com os botões de gerar o primeiro plano.
5. Clicar em "Planejamento" na sidebar → mesma regra (passa pelo `/` e cai no mês corrente/mais recente).
6. Sidebar não exibe mais o item "Dashboard". Apenas Planejamento, Categorias, Relatórios, Configurações.
7. Clicar no logo "PlanFin" no topo da sidebar → mesmo redirect inteligente.
8. Em produção: após o deploy no Vercel, validar com o usuário real (que estava preso em Março/2026) que agora ele cai em Abril/2026.
