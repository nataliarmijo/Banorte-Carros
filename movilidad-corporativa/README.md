# Movilidad Corporativa

Aplicación web responsive para reservación, asignación, control y optimización de una flotilla corporativa compartida para Banorte.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## Estructura base

- app/: rutas y páginas
- components/: UI reutilizable
- features/: lógica por dominio
- lib/services/: motores de negocio
- lib/repositories/: acceso a datos con Dexie/IndexedDB
- lib/models/: tipos e interfaces TypeScript
- lib/seed/: datos demo
- lib/config/: reglas y tarifas centralizadas

## Herramientas incluidas

- Next.js App Router + TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Zustand
- Dexie.js
- Zod
- date-fns
- ESLint + Prettier
