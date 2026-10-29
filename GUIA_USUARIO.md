# IMASPORT — Guía de Usuario

Plataforma de IMASPORT para CrossFit, Hyrox y Calistenia. Las cuentas, los
datos y las fotos son reales: se guardan en AWS (Cognito para las cuentas,
DynamoDB para los datos, S3 para las imágenes).

> **Pagos:** todavía no se cobran en línea. Al registrarse, el plan elegido
> queda como *pendiente de pago* y un administrador lo marca como pagado desde
> el panel. Todo lo demás funciona de verdad.

---

## Roles

La plataforma distingue cuatro tipos de usuario. El rol determina qué se ve y
qué se puede hacer; lo asigna un administrador y no se puede cambiar desde la
app.

| Rol | Cómo se obtiene | A qué accede |
|---|---|---|
| **Visitante** | Sin cuenta | Página principal, planes, coaches, eventos, galería pública |
| **Atleta** | Se registra en `/register` | Su panel, su perfil, sus fotos, inscripción a eventos |
| **Coach** | Se registra en `/register-coach` y un administrador lo aprueba | Panel de coach: evaluar atletas, tomar fotos, ver clases del día |
| **Administrador** | Lo designa otro administrador | Todo el panel `/admin` |

---

## Crear una cuenta

### Atleta (`/register`)

1. Nombre, correo, teléfono y contraseña.
2. Disciplina (CrossFit, Hyrox o Calistenia) y plan.
3. Llega un **código de 6 dígitos por correo**. Se captura en `/confirmar`.
4. Listo: al iniciar sesión se entra al panel del atleta.

La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula,
número y símbolo. El formulario lo valida antes de enviar.

### Coach (`/register-coach`)

Mismo proceso, más certificaciones, años de experiencia, especialidad y
biografía.

**Importante:** el coach empieza como atleta. Un administrador revisa la
solicitud en `/admin/usuarios/solicitudes` y al aprobarla el panel de coach se
desbloquea. Después de la aprobación hay que **cerrar sesión y volver a
entrar** para que el nuevo rol tome efecto.

Si alguien ya tiene cuenta y quiere ser coach, puede solicitarlo desde su
perfil ("Solicitar ser coach").

### Recuperar contraseña

`/recuperar`: se pide el correo, llega un código y se define la nueva
contraseña.

---

## Sitio público

### Página principal (`/`)

Hero, servicios (CrossFit / Hyrox / Calistenia), planes, coaches, eventos y
preguntas frecuentes. **Todo el contenido lo administra el panel**: los planes,
los coaches, las preguntas y los eventos salen de la base de datos, no están
escritos en el código.

### Planes (`/planes`)

Las membresías con su precio y beneficios. El plan destacado y el orden se
configuran desde `/admin/planes`.

### Eventos (`/eventos`)

Lista de competencias y eventos, los próximos primero y los pasados en una
sección aparte. Cada evento tiene su página con descripción, fecha, lugar,
lugares disponibles y galería de fotos si ya se subió una.

**Inscribirse** requiere sesión. Si el evento está lleno, la inscripción queda
en lista de espera. Desde la misma página se puede cancelar.

### Galería (`/galeria`)

Álbumes de fotos del gym y de las competencias, con visor de pantalla completa
(flechas para navegar, Esc para cerrar).

Hay dos tipos de álbum:

- **Público** — lo ve cualquiera.
- **Solo miembros** — aparece con un candado para quien no tiene sesión. Las
  fotos no se descargan hasta que la persona inicia sesión; el bloqueo es del
  servidor, no solo visual.

---

## Panel del Atleta (`/dashboard`)

Resumen de progreso, calculado a partir de datos reales:

- **Sesiones del mes**, **racha de días consecutivos**, **PRs del mes** y
  **calorías**. Las comparaciones contra el mes anterior solo se muestran
  cuando hay con qué comparar — nunca se inventa un número.
- **Analíticas por disciplina** en tres pestañas (CrossFit, Hyrox,
  Calistenia): progresión de levantamientos, perfil de rendimiento en radar,
  tiempos por estación de Hyrox, progresiones de habilidades de calistenia,
  etc. Las gráficas se alimentan de lo que el coach registra en sus
  evaluaciones.
- **Métricas corporales**, **entrenamientos recientes**, **logros**,
  **próxima clase** e **inscripciones a eventos**.

Una cuenta nueva no tiene historial, así que cada sección muestra un mensaje
invitando a empezar en lugar de gráficas vacías.

---

## Perfil (`/profile`)

- **Foto de perfil** — se sube desde el dispositivo (máximo 5 MB).
- **Información personal** — nombre, teléfono, edad.
- **Métricas corporales** — peso, altura, % de grasa.
- **Objetivos** — selección múltiple.
- **Agendar sesión con coach** — coach, tipo de sesión, fecha y horario. Las
  citas quedan como *pendientes* y se pueden cancelar.
- **Preferencias de notificaciones** — avisos de clase, recordatorios y resumen
  semanal.
- **Solicitar ser coach**, si aplica.

---

## Mis Fotos (`/mis-fotos`)

Las fotos que los coaches tomaron durante las sesiones, agrupadas por mes y con
visor ampliado. Solo las ve el atleta, su coach y un administrador.

---

## Panel de Coach (`/coach`)

Pensado para tablet, con botones grandes.

- **Lista de atletas** con buscador, disciplina, plan y fecha de su última
  sesión.
- **Formulario de evaluación**: calificaciones de 1 a 10 en rendimiento,
  técnica y esfuerzo; métricas numéricas según la disciplina; y notas.
  Al guardar, los números **alimentan las gráficas del atleta**.
- **Tomar foto** — abre la cámara trasera en tablet y la foto queda ligada a la
  evaluación.
- **Sesiones de hoy** con su estado.

---

## Panel de Administración (`/admin`)

| Sección | Qué permite |
|---|---|
| **Resumen** | Conteos de usuarios, coaches, solicitudes pendientes, eventos, álbumes y fotos |
| **Eventos** | Crear, editar, publicar y borrar eventos; portada; destacado |
| **Inscripciones** | Quién se inscribió, cambiar estado, marcar asistencia, exportar CSV |
| **Galería** | Crear álbumes, subir varias fotos a la vez, poner leyendas, reordenar, borrar |
| **Usuarios** | Ver todas las cuentas, cambiar rol, activar/desactivar, editar plan y estado de pago |
| **Solicitudes de coach** | Aprobar o rechazar; al aprobar se puede crear su tarjeta pública |
| **Planes** | Nombre, precio y beneficios de cada membresía (español e inglés) |
| **Coaches** | La cuadrícula pública de coaches: foto, bio, certificaciones, orden |
| **FAQ** | Las preguntas frecuentes del sitio |
| **Contenido** | Datos de contacto, redes sociales y estadísticas del hero |

Notas de uso:

- **Borrar es explícito.** Un evento con inscripciones no se borra salvo que se
  confirme borrarlas también; al borrar un álbum se borran sus fotos y se dice
  cuántas.
- **Los lugares disponibles** de un evento se recalculan solos cada vez que
  cambia una inscripción.
- Subir una foto a un álbum *solo para miembros* la guarda en una ruta privada.
  Si después se cambia la visibilidad del álbum, las fotos ya subidas **no se
  mueven**.

---

## Funciones generales

- **Tema claro / oscuro** — con el icono de sol/luna. Se recuerda en el
  navegador y se aplica antes de que la página pinte, sin parpadeo.
- **Español / Inglés** — con el botón ES/EN.
- **Diseño responsivo** — móvil, tablet (ideal para el panel de coach) y
  escritorio.

---

## Resumen de URLs

| Página | URL | Quién entra |
|---|---|---|
| Inicio | `/` | Cualquiera |
| Planes | `/planes` | Cualquiera |
| Eventos | `/eventos` | Cualquiera |
| Detalle de evento | `/eventos/[id]` | Cualquiera |
| Galería | `/galeria` | Cualquiera |
| Álbum | `/galeria/[slug]` | Cualquiera (los de miembros, con sesión) |
| Términos | `/terminos` | Cualquiera |
| Privacidad | `/privacidad` | Cualquiera |
| Iniciar sesión | `/login` | Sin sesión |
| Registro | `/register` | Sin sesión |
| Registro de coach | `/register-coach` | Sin sesión |
| Confirmar correo | `/confirmar` | Sin sesión |
| Recuperar contraseña | `/recuperar` | Sin sesión |
| Panel del atleta | `/dashboard` | Atleta |
| Perfil | `/profile` | Atleta |
| Mis fotos | `/mis-fotos` | Atleta |
| Panel de coach | `/coach` | Coach y administrador |
| Administración | `/admin` | Administrador |

Quien entre a una página que no le corresponde se redirige a la suya; sin
sesión, va a `/login` y después del acceso regresa a donde iba.

---

## Pendientes conocidos

1. **Pagos en línea.** No implementados. El plan se marca como pagado a mano.
2. **Correo de verificación.** Hoy sale del remitente propio de Cognito, con un
   **límite de 50 correos al día**. Para producción hay que configurar SES.
3. **Términos y privacidad** son borradores, marcados como tales, pendientes de
   revisión legal.
4. Los textos de la sección **Servicios** siguen en el código (no hay modelo
   que los administre todavía).
5. Las fotos de un álbum **solo para miembros** quedan protegidas por la página
   y por el servidor de imágenes, pero sus leyendas y nombres de archivo
   podrían consultarse por la API. Las imágenes en sí no se pueden abrir sin
   sesión.

---

## Para desarrollo y despliegue

Ver `DEPLOYMENT.md`: cómo levantar el entorno, cargar datos iniciales, correr
las pruebas (`npm test`, `npm run test:e2e`) y desplegar a producción.
