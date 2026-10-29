# IMASPORT

Plataforma web del gimnasio IMASPORT (Morelia): CrossFit, Hyrox y Calistenia.
Sitio público, panel para atletas, panel para coaches y administración.

**Next.js 16** (App Router, SSR) sobre **AWS Amplify Gen 2** — Cognito para
cuentas y roles, AppSync/DynamoDB para datos, S3 para fotos.

---

## Arrancar

Requiere **Node 22** (la CLI de Amplify Gen 2 no soporta versiones más nuevas;
ver `DEPLOYMENT.md`).

```bash
nvm use 22
npm install

npm run sandbox        # despliega tu backend aislado en AWS
SEED_ADMIN_PASSWORD='...' npm run seed    # contenido inicial + primer admin
npm run dev
```

El sandbox genera `amplify_outputs.json`, que no se versiona porque cambia por
entorno.

Para datos de ejemplo (un atleta con historial, para ver las gráficas):

```bash
SEED_ADMIN_PASSWORD='...' SEED_DEMO=1 npm run seed
```

## Pruebas

```bash
npm run typecheck
npm run lint
export SEED_ADMIN_PASSWORD='...'   # las pruebas inician sesión como admin
npm run test:auth    # 52 verificaciones de lo que cada rol puede y NO puede
npm run test:e2e     # 59 verificaciones en navegador (requiere npm run dev)
npm run test:coach   # solo el flujo de coach (crear coach, evaluar, ver datos)
```

`test:auth` es la red de seguridad importante: si alguien cambia una regla de
autorización en `amplify/data/resource.ts`, estas pruebas lo detectan.

## Estructura

| Ruta | Qué hay |
|---|---|
| `amplify/` | Backend: auth, 17 modelos de datos, storage, Lambdas |
| `app/` | Rutas. `app/admin` es el panel de administración |
| `components/` | UI. `admin/`, `member/`, `gallery/` por área |
| `lib/` | Acceso a datos, sesión (`dal.ts`), roles, media, caché |
| `proxy.ts` | Filtro de rutas (en Next 16 reemplaza a `middleware.ts`) |
| `scripts/` | Seed, pruebas y mantenimiento |

## Seguridad, en corto

- Los **roles son grupos de Cognito** (`ADMINS` / `COACHES` / `ATHLETES`). Es la
  única fuente de verdad; `UserProfile.role` es solo una copia para listar.
- Un registro **nunca** puede darse privilegios: todos caen en `ATHLETES`, y los
  cambios de rol pasan por mutaciones restringidas a `ADMINS`.
- Los **coaches no se registran**: un administrador crea su cuenta desde
  `/admin/usuarios`. Crear cuentas es una mutación exclusiva de `ADMINS`.
- `proxy.ts` filtra rutas, pero **cada página protegida vuelve a verificar** con
  `requireRole()`. El proxy nunca es la única defensa.
- El bucket de S3 es privado. Las imágenes se sirven por `/api/media/<key>`,
  que autoriza y redirige a una URL firmada de corta duración.
- No hay contraseñas en el repositorio.

## Documentación

- **`GUIA_USUARIO.md`** — guía funcional: roles, registro, cada pantalla.
- **`DEPLOYMENT.md`** — despliegue, pendientes antes de abrir al público y los
  problemas conocidos (incluido por qué el build usa `npm install` y no
  `npm ci`, y por qué el override de `tsx` no se debe quitar).
