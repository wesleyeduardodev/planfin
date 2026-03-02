# PlanFin

Sistema de planejamento financeiro mensal. Organiza receitas e despesas em 2 periodos por mes, automatiza lancamentos recorrentes e acompanha saldos com graficos.

## Pre-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (para o banco PostgreSQL)

## Subida local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variaveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e gere um secret para o NextAuth:

```bash
openssl rand -base64 32
```

Cole o valor gerado em `NEXTAUTH_SECRET`. O arquivo final deve ficar assim:

```env
DATABASE_URL=postgresql://planfin:planfin@localhost:5438/planfin
NEXTAUTH_SECRET=seu-secret-gerado-aqui
NEXTAUTH_URL=http://localhost:3000
```

### 3. Subir o banco de dados

```bash
docker compose up -d
```

Isso sobe um container PostgreSQL 17 na porta 5438. Para verificar se esta rodando:

```bash
docker compose ps
```

### 4. Rodar as migrations

```bash
npm run db:migrate
```

Na primeira vez, o Prisma vai pedir um nome para a migration (pode usar `init`).

### 5. Popular o banco com dados iniciais

```bash
npm run db:seed
```

Isso cria:
- Usuario admin: `admin@planfin.com` / `admin123`
- Categorias padrao: Cartoes, Contas Fixas, Familia, Obra, Outros

### 6. Iniciar o servidor

```bash
npm run dev
```

Acesse **http://localhost:3000** e faca login com as credenciais do seed.

## Comandos uteis

| Comando | Descricao |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run start` | Inicia build de producao |
| `npm run lint` | Executa ESLint |
| `npm run db:migrate` | Roda migrations do Prisma |
| `npm run db:seed` | Popula banco com dados iniciais |
| `npm run db:reset` | Reseta banco (apaga tudo e recria) |
| `npm run db:studio` | Abre Prisma Studio (GUI do banco) |
| `docker compose up -d` | Sobe o PostgreSQL |
| `docker compose down` | Para o PostgreSQL |
| `docker compose down -v` | Para o PostgreSQL e apaga os dados |

## Stack

- **Next.js 16** (App Router) + TypeScript
- **PostgreSQL 17** + **Prisma 6**
- **NextAuth.js v5** (autenticacao com email/senha)
- **Tailwind CSS 4** + **shadcn/ui**
- **Recharts** (graficos)
- **TanStack Query** (estado client-side)
