# PG Insights

AI-powered PostgreSQL database copilot. Connect, explore, query, and gain insights from your databases.

## Features

- **Schema Explorer** — Browse tables, columns, relationships, and estimated row counts
- **Query Editor** — Write and run SQL with AI-assisted generation
- **Smart Insights** — Detect null rates, missing indexes, and join suggestions
- **Dashboards** — Build custom dashboards with chart tiles
- **Safe Mode** — Read-only query enforcement with destructive query detection
- **Docker Support** — One-command setup with Docker Compose

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or Node.js + npm)
- PostgreSQL database
- Docker (optional)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/postgres.git
cd postgres

# Install dependencies
bun install

# Copy the environment template
cp .env.local.example .env.local

# Edit .env.local with your database connection string
# DATABASE_URL=postgresql://user:password@host:5432/database

# Start the dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and configure your connection in Settings.

### Docker

```bash
cp .env.local.example .env.local
bun docker:up
```

## AI Features

Add an OpenRouter API key in Settings to enable:
- Natural language to SQL generation
- Schema-aware query suggestions
- AI-powered dashboard and chart generation

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS
- [TanStack Query](https://tanstack.com/query) + [TanStack Table](https://tanstack.com/table)
- [Recharts](https://recharts.org)
- PostgreSQL (`pg` driver)
- [OpenRouter](https://openrouter.ai) for AI features
