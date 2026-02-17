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

## Deploy a GitHub Pages

1. En GitHub, activa Pages con source `GitHub Actions`.
2. (Opcional recomendado) Crea la variable de repositorio `VITE_API_BASE` en:
   `Settings > Secrets and variables > Actions > Variables`.
3. Haz push a `main`.
4. El workflow `.github/workflows/deploy-pages.yml` construye y publica automáticamente.

Notas:
- El `base` de Vite está configurado para este repo (`/fortnite-coins/`) en producción.
- Se genera `dist/404.html` para soportar rutas SPA en GitHub Pages.
