# IMASPORT — despliegue y operación

Infraestructura: **AWS Amplify Gen 2** (Cognito + AppSync/DynamoDB + S3) con un
frontend **Next.js 16** en Amplify Hosting (SSR / `WEB_COMPUTE`).

| | |
|---|---|
| Cuenta AWS | `236172119695` |
| Región | `us-east-1` |
| App de Amplify | `imasport` — `d3sfi4ynsdvtlm` |
| Repositorio | `github.com/frantoqui/imasport` |
| Rama que se despliega | `development` (auto-build activado) |

---

## Requisitos locales

Node **22** (la CLI de Amplify Gen 2 no soporta versiones más nuevas; ver
"Problemas conocidos"):

```bash
nvm use 22
npm ci
```

---

## Entorno de desarrollo (sandbox)

Cada desarrollador trabaja contra su propio stack aislado. No comparte datos con
producción.

```bash
npm run sandbox          # despliega y se queda observando cambios
npm run sandbox:once     # despliega una vez y termina
npm run sandbox:delete   # borra el stack cuando ya no se necesita
```

El sandbox escribe `amplify_outputs.json`, que **no se versiona**: cambia por
entorno y lo genera la CI en producción.

Después del primer despliegue, carga el contenido inicial y crea el primer
administrador:

```bash
SEED_ADMIN_PASSWORD='una-contraseña-fuerte' npm run seed
```

Esto es idempotente: se puede volver a correr sin duplicar nada.

**Las contraseñas nunca se guardan en el repositorio.** Si no defines
`SEED_ADMIN_PASSWORD`, el script genera una y la imprime una sola vez — anótala.
Las pruebas (`test:auth`, `test:e2e`, `prune:orphans`) también la necesitan,
porque inician sesión como administrador:

```bash
export SEED_ADMIN_PASSWORD='...'
```

Para no exportarla en cada terminal, puedes ponerla en `.env.local`
(ya está en `.gitignore`) y cargarla con tu herramienta preferida.

```bash
npm run dev              # http://localhost:3000 (usa otro puerto si está ocupado)
```

---

## Pruebas

```bash
npm run typecheck        # next typegen + tsc
npm run lint
npm run test:auth        # 46 pruebas de autorización contra el backend real
npm run test:e2e         # pruebas de navegador (requiere npm run dev aparte)
npm test                 # typecheck + test:auth
```

`test:auth` es la red de seguridad importante: verifica qué puede y, sobre todo,
qué **no** puede hacer cada rol (visitante anónimo, atleta, coach, admin). Si
alguien cambia una regla de autorización en `amplify/data/resource.ts`, estas
pruebas lo detectan. Crea usuarios desechables y los borra al terminar.

`test:e2e` necesita saber el puerto si no es el 3000:

```bash
E2E_BASE_URL=http://localhost:3001 npm run test:e2e
```

---

## Despliegue a producción

### Requisito único: rol de servicio para el backend

Amplify Hosting necesita un rol con la política administrada
`AmplifyBackendDeployFullAccess` para poder desplegar un backend Gen 2. El rol
de SSR que ya tenía la app **no sirve** para esto (solo cubre logging).

```bash
# 1. Crear el rol
aws iam create-role \
  --role-name AmplifyBackendDeployRole-imasport \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "amplify.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

# 2. Adjuntar la política administrada de AWS
#    Ojo: va bajo la ruta service-role/, no en la raíz.
aws iam attach-role-policy \
  --role-name AmplifyBackendDeployRole-imasport \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess

# 3. Conservar el permiso de logs de SSR.
#    La app solo admite UN rol de servicio, y el que tenía antes
#    (AmplifySSRLoggingRole-…) era el que permitía escribir los logs de SSR en
#    CloudWatch. Al reemplazarlo hay que adjuntar también esa política, o se
#    pierden los logs del servidor.
aws iam attach-role-policy \
  --role-name AmplifyBackendDeployRole-imasport \
  --policy-arn arn:aws:iam::236172119695:policy/service-role/AmplifySSRLoggingPolicy-f9c632d3-85ad-4e78-ada1-2070bbb88c63

# 4. Asignarlo a la app
aws amplify update-app \
  --app-id d3sfi4ynsdvtlm \
  --region us-east-1 \
  --iam-service-role-arn arn:aws:iam::236172119695:role/AmplifyBackendDeployRole-imasport
```

Estado actual: ya está creado y asignado, con las dos políticas.

### Despliegue

`amplify.yml` en la raíz define las dos fases: `backend` corre
`npx ampx pipeline-deploy` (despliega el backend de la rama y genera
`amplify_outputs.json`) y `frontend` corre `tsc --noEmit` y `next build`.

Con auto-build activado, basta con hacer push:

```bash
git push origin development
```

El build se puede seguir en la consola de Amplify o con:

```bash
aws amplify list-jobs --app-id d3sfi4ynsdvtlm --branch-name development --region us-east-1
```

### Después del primer despliegue a producción

El backend de producción es un stack distinto al del sandbox, así que arranca
vacío. Hay que poblarlo una vez, apuntando a los outputs de producción:

```bash
npx ampx generate outputs --app-id d3sfi4ynsdvtlm --branch development
SEED_ADMIN_EMAIL=tu-correo@dominio.com \
SEED_ADMIN_PASSWORD='una-contraseña-fuerte' \
npm run seed
```

---

## Pendientes antes de abrir al público

1. **Definir la contraseña del administrador** con `SEED_ADMIN_PASSWORD` al
   correr el seed en producción, y guardarla en un gestor de contraseñas. Si no
   se define, el script genera una al azar y la imprime una sola vez.
2. **Dejar de usar credenciales de root.** Las llaves actuales son de la cuenta
   root (`arn:aws:iam::236172119695:root`), algo que AWS recomienda no hacer:
   no se pueden limitar por permisos ni revocar sin rotar todo. Crear un usuario
   IAM con los permisos necesarios y rotar las llaves de root.
3. **Correo de Cognito.** Por defecto Cognito envía los códigos de verificación
   con su remitente propio y un **límite de 50 correos al día**. Para producción
   hay que configurar SES con un dominio verificado, en
   `amplify/auth/resource.ts` → `senders.email`.
4. **Revisión legal** de `/terminos` y `/privacidad`: hoy son borradores
   marcados como tales.
5. **Pagos.** No están implementados a propósito. El registro guarda el plan
   elegido con `planStatus: PENDING` y el administrador lo marca como pagado a
   mano desde `/admin/usuarios`.
6. **Dominio propio.** La app vive en
   `d3sfi4ynsdvtlm.amplifyapp.com`; conectar el dominio real en la consola de
   Amplify.

---

## Problemas conocidos

### `tsx` fijado por Amplify

`@aws-amplify/backend-deployer` fija `tsx@4.19.4`, cuya resolución de módulos
ESM falla en Node moderno: el despliegue muere con
`Cannot find module '.../amplify/auth/resource'`. Se corrige con un `overrides`
en `package.json`:

```json
"overrides": { "tsx": "^4.23.15" }
```

**No quitar ese override**, ni en local ni en CI: sin él el backend no se puede
desplegar. Las importaciones dentro de `amplify/` usan extensión `.js`
explícita, que es válida en ESM y en CJS.

### `npm ci` no funciona en este proyecto

El build usa `npm install`, no `npm ci`, y eso es deliberado.

Los propios paquetes de Amplify tienen versiones exactas en conflicto para
`@aws-cdk/toolkit-lib`: `@aws-amplify/plugin-types` lo fija en `1.32.0` y
`@aws-amplify/backend-deployer` pide `^1.40.0`. Ningún `package-lock.json`
generado por `npm install` satisface la validación más estricta de `npm ci`:
siempre falla con

```
npm error Missing: @aws-cdk/toolkit-lib@1.19.0 from lock file
```

pidiendo una versión que ningún paquete declara. Se reprodujo en un directorio
aislado, con npm 10 y con npm 11, y borrando `node_modules` y el lockfile.

El lockfile sí se versiona y `npm install` lo respeta donde es consistente. **No
cambiar `npm install` por `npm ci` en `amplify.yml`** sin verificar antes que el
problema upstream ya se resolvió.

### Autenticación por identity pool para usuarios con sesión

Al iniciar sesión, el usuario entra a un grupo de Cognito y el identity pool le
entrega el rol **de ese grupo** (`ATHLETES`/`COACHES`/`ADMINS`). Amplify solo
asigna permisos de AppSync a los roles autenticado/no-autenticado por defecto,
así que una lectura con `identityPool` por parte de un usuario con sesión
devuelve `Unauthorized`.

No se puede arreglar desde el schema. En el cliente hay que usar
`publicAuthMode()` de `lib/amplify-client.ts`, que elige `userPool` cuando hay
sesión y `identityPool` cuando no. En el servidor, `listAsGuest`/`getAsGuest`
corren sin contexto de petición, así que siempre usan credenciales anónimas y
no se ven afectados.

### `TS2321` con el cliente SSR de Amplify

El cliente de request/response tipa `list()`/`get()` con un tipo condicional
tan profundo que TypeScript no lo puede comparar ni consigo mismo. Por eso
`lib/amplify-server.ts` lo convierte una sola vez a una fachada mínima y expone
`listAsGuest<T>()` / `getAsGuest<T>()`, donde `T` se pasa explícitamente como
`Schema["Modelo"]["type"]`. El cliente con cookies (`userClient`) no tiene este
problema y se usa con tipos completos.

### Campos `a.json()`

`SiteSetting.value` y `Evaluation.metrics` son el escalar `AWSJSON` de AppSync:
hay que escribirlos con `JSON.stringify(obj)` y al leerlos llegan como *string*,
así que se parsean dentro de un `try/catch`.

---

## Arquitectura, en breve

- **Roles** = grupos de Cognito. Es la única fuente de verdad.
  `UserProfile.role` es solo una copia para poder listar y filtrar.
- **Cambios de rol** pasan por las mutaciones `setUserRole` / `setUserEnabled`,
  restringidas a `ADMINS` y respaldadas por la Lambda `user-admin`. Ningún
  cliente puede escribir su propio rol.
- **Alta de usuarios**: todo registro nuevo cae en `ATHLETES` mediante el
  trigger `post-confirmation`. Quien se registra como coach queda con
  `coachStatus: PENDING` y un administrador lo aprueba.
- **Autorización de rutas**: `proxy.ts` (antes `middleware.ts`) hace el filtro
  optimista; además **cada página protegida** llama a `requireRole()` de
  `lib/dal.ts`. El proxy nunca es la única defensa.
- **Media**: el bucket es privado. Todo pasa por `/api/media/<key>`, que
  autoriza al visitante y redirige a una URL firmada de corta duración. Los
  lectores nunca reciben permiso de `list`, así que el bucket no se puede
  recorrer.
