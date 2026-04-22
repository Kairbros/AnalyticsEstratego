# AnalyticsEstratego

Software de diagnóstico comercial: analiza el embudo de ventas de un negocio, calcula pérdidas, escenario optimizado y ROI en tiempo real.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **BD:** PostgreSQL (vía Docker)

## Estructura

```
AnalyticsEstratego/
├── frontend/            # React + Vite
├── backend/             # Node.js + Express
└── docker-compose.yml   # PostgreSQL + pgAdmin
```

## Arrancar entorno local

```bash
docker compose up -d           # PostgreSQL en 5432, pgAdmin en 5050
cd backend && npm run dev      # API en 3001
cd frontend && npm run dev     # UI en 5173
```
