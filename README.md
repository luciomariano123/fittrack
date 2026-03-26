# FitTrack

App de seguimiento fitness fullstack con Next.js 14, Prisma y WhatsApp (Capso).

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** con design system personalizado
- **PostgreSQL** + Prisma ORM
- **NextAuth.js** (credentials provider)
- **Recharts** para gráficas
- **node-cron** para notificaciones programadas
- **Zod** para validación

## Setup

### 1. Instalá dependencias

```bash
npm install
```

### 2. Configurá las variables de entorno

```bash
cp .env.example .env
```

Editá `.env` con tus valores:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fittrack"
NEXTAUTH_SECRET="tu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"
```

Para generar `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Creá la base de datos

Asegurate de tener PostgreSQL corriendo y la DB `fittrack` creada:

```bash
createdb fittrack
```

### 4. Ejecutá las migraciones de Prisma

```bash
npm run db:push
```

O si preferís ver el schema:
```bash
npm run db:studio
```

### 5. Corrés la app

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Flujo de uso

1. **Registro** → `/register` — Creá tu cuenta
2. **Onboarding** → `/onboarding` — 4 pasos para configurar tu perfil, métricas y rutina
3. **Dashboard** → `/dashboard` — Vista general con métricas, progreso y calendario
4. **Rutinas** → `/rutinas` — Gestión del plan semanal y marcado de sesiones
5. **Peso** → `/peso` — Registro de peso con gráfica y proyección
6. **Comidas** → `/comidas` — Log nutricional con base de datos de alimentos argentinos
7. **Notificaciones** → `/notificaciones` — Configuración de recordatorios por WhatsApp

## Notificaciones por WhatsApp (Capso)

Para activar las notificaciones:

1. Creá una cuenta en [capso.com](https://capso.com)
2. Obtené tu API key
3. En la app, andá a **Notificaciones** y configurá tu número y API key

### Comandos disponibles via WhatsApp

- `peso X.X` — Registra tu peso (ej: `peso 78.5`)
- `listo` — Marca la sesión de hoy como completada

### Webhook

Configurá el webhook de Capso apuntando a:
```
https://tu-dominio.com/api/webhook/capso
```

## Cron jobs

Los cron jobs de notificaciones se inicializan desde `jobs/notifications.ts`. En producción, necesitás iniciarlos en algún punto del lifecycle del servidor (por ejemplo, en un script de startup o usando un worker process).

```bash
# Para iniciar manualmente (desarrollo)
npx ts-node jobs/notifications.ts
```

## Estructura del proyecto

```
fittrack/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── onboarding/
│   ├── dashboard/
│   ├── rutinas/
│   ├── peso/
│   ├── comidas/
│   ├── notificaciones/
│   ├── configuracion/
│   └── api/
│       ├── auth/
│       ├── dashboard/
│       ├── weight/
│       ├── sessions/
│       ├── food/
│       ├── exercises/
│       ├── notifications/
│       ├── profile/
│       └── webhook/
├── components/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── auth.ts
│   ├── calculations.ts
│   ├── capso.ts
│   ├── food-database.ts
│   ├── message-templates.ts
│   ├── prisma.ts
│   └── utils.ts
├── jobs/
│   └── notifications.ts
└── prisma/
    └── schema.prisma
```
