# ERP Financeiro Modular

## Commands

The project has no package manifest, test runner, lint configuration, or build step.

### PostgreSQL

Create/select a PostgreSQL database named `erp_financeiro`, then apply the schema and demo data:

```bash
createdb erp_financeiro
psql -d erp_financeiro -f database/schema.sql
psql -d erp_financeiro -f database/seed.sql
```

Set `DATABASE_URL` when the local connection is not `postgresql://postgres@localhost:5432/erp_financeiro`.

Useful SQL checks are in `database/consulta.sql`: overdue status updates and daily/monthly cash-flow queries.

### API

The backend dependencies are FastAPI, psycopg, and Pydantic. The local `.venv` is available but is not committed:

```bash
source .venv/bin/activate
uvicorn backend.main:app --reload
```

The API listens on `http://127.0.0.1:8000` by default. Check it with:

```bash
curl http://127.0.0.1:8000/health
curl "http://127.0.0.1:8000/lancamentos"
```

For an individual endpoint during development, use FastAPI's interactive docs at `http://127.0.0.1:8000/docs`; there is no focused automated test command in this repository.

### Frontend

This is a static Vanilla JS application with no frontend dependencies or build step:

```bash
python3 -m http.server 3000 --directory frontend
```

Open `http://localhost:3000`. The frontend defaults to the API at `http://127.0.0.1:8000` and can be overridden before loading `app.js` with `window.ERP_API_URL`.

## Architecture

- `frontend/index.html` defines the dashboard structure and IDs used by the JavaScript.
- `frontend/js/app.js` owns the UI state, API access, fallback/demo data, filters, rendering, creation, payment, overdue checking, reset, and JSON export.
- `backend/main.py` is a small FastAPI application: Pydantic request models, psycopg database access, transaction handling, and the HTTP routes.
- `database/schema.sql` defines the normalized PostgreSQL tables, constraints, indexes, and the two accounting views:
  - `vw_saldo_contas_bancarias` computes each account's reconciled balance.
  - `vw_fluxo_caixa_diario` derives paid inflows, paid outflows, and net cash flow.
- `database/seed.sql` seeds the five banks, accounts, categories, and demo entries used by both API and fallback UI data.

The normal flow is browser -> FastAPI -> PostgreSQL views/tables. When the API is unavailable or `/health` fails, `app.js` switches to the in-browser fallback datasets and mutates those datasets locally.

## API and Data Conventions

- Monetary values use PostgreSQL `NUMERIC(14, 2)` and Pydantic `Decimal`; keep SQL aggregates and response values aligned with decimal precision.
- Entry status values are exactly `pendente`, `pago`, and `atrasado`; entry types are exactly `receber` and `pagar`.
- A paid entry must have `data_pagamento`. API creation assigns today's date when status is `pago` and clears payment date for other statuses.
- Reconciled account balances are calculated from `saldo_inicial` plus paid entries: received entries increase the balance and payable entries decrease it.
- Daily cash flow uses `data_pagamento` or `data_vencimento` as its reference date. Monthly cash flow uses `DATE_TRUNC('month', ...)`.
- API mutations must commit explicitly and roll back `psycopg.Error` failures. Preserve `404` behavior for missing entries when extending routes.

## Frontend Conventions

- The frontend has no framework or module system; it uses a single global `state` object and direct DOM queries in `frontend/js/app.js`.
- Keep the elements and IDs in `index.html` synchronized with `app.js` selectors; rendering is centralized through `renderizarTudo()`.
- Preserve API/fallback parity: changes that affect displayed accounts or entries may require updates to both `FALLBACK_CONTAS`/`FALLBACK_LANCAMENTOS` and the API-backed response shape.
- `BANCO_PARA_CONTA_ID` is the frontend mapping from bank names to database account IDs. Keep it consistent with `database/seed.sql` and account creation logic.
- Filter state lives in `state.filtroStatus`, `state.filtroBanco`, and `state.periodoFluxo`; the table, KPIs, and bank cards derive from that state.
- API requests have a three-second timeout and a JSON content type. Network failure handling belongs in `carregarDados()` or `apiRequest()` rather than in individual renderers.
