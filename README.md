# Fortnite Coins Frontend

Frontend en Vite + React + TypeScript, listo para GitHub Pages.

## Requisitos

- Node.js 20+
- npm

## Ejecutar en local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea tu archivo de entorno:
   ```bash
   cp .env.example .env.local
   ```
3. Ajusta `VITE_API_BASE` si es necesario en `.env.local`.
4. Levanta el proyecto:
   ```bash
   npm run dev
   ```

## Variable de entorno

Archivo `.env.example`:

```env
VITE_API_BASE=https://fortnite-coins-worker.juanocopiasierra2.workers.dev
```

## Trading multiusuario (MVP)

La app ahora soporta trading por sala con credenciales:

- `room_code`: cÃ³digo de sala (si no existe, se crea)
- `display_name`: nombre del jugador en la sala
- `player_code`: PIN del jugador para autenticar operaciones

Flujo bÃ¡sico:

1. Al abrir la app, aparece `Join Room` si no hay sesiÃ³n guardada.
2. Ingresa `room_code`, `display_name` y `player_code`.
3. Se habilita `My Wallet` y botones `BUY`/`SELL` en cards y tabla.
4. Cada trade se ejecuta con spread fijo de `0.5%` (`0.005`).

Reglas del MVP:

- Cash inicial por jugador: `100000` (moneda virtual).
- `BUY` usa precio `price_now * (1 + 0.005)`.
- `SELL` usa precio `price_now * (1 - 0.005)`.
- Validaciones:
  - No compra si cash insuficiente.
  - No venta si holdings insuficientes.

## Supabase SQL

Ejecuta el script:

```bash
scripts/supabase_trading.sql
```

Este script crea:

- `rooms`
- `room_players`
- `holdings`
- `trades`

Para MVP se deja sin RLS (acceso por `SUPABASE_SERVICE_ROLE_KEY` desde Worker).

## Worker

Se incluye implementaciÃ³n en:

```bash
worker/index.ts
```

Endpoints incluidos:

- `POST /api/room/join`
- `GET /api/wallet`
- `POST /api/trade`
- `GET /api/market`
- `GET /api/players`
- `POST /api/sync`
- `GET /api/rooms/debug` (requiere `ADMIN_TOKEN` o `SYNC_TOKEN`)

Todas las respuestas JSON del Worker usan headers combinados de JSON + CORS.

## Deploy a GitHub Pages

1. En GitHub, activa Pages con source `GitHub Actions`.
2. (Opcional recomendado) Crea la variable de repositorio `VITE_API_BASE` en:
   `Settings > Secrets and variables > Actions > Variables`.
3. Haz push a `main`.
4. El workflow `.github/workflows/deploy-pages.yml` construye y publica automáticamente.

Notas:
- El `base` de Vite está configurado para este repo (`/fortnite-coins/`) en producción.
- Se genera `dist/404.html` para soportar rutas SPA en GitHub Pages.
