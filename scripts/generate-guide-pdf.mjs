import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../GUIA_IMASPORT.pdf");
const SHOTS_DIR = path.resolve(__dirname, "screenshots");
const BASE = "http://localhost:3000";

const pages = [
  { url: "/", name: "Pagina Principal", wait: 2000 },
  { url: "/", name: "Servicios", scrollTo: "#servicios", wait: 1000 },
  { url: "/", name: "Planes", scrollTo: "#planes", wait: 1000 },
  { url: "/", name: "Coaches", scrollTo: "#coaches", wait: 1000 },
  { url: "/", name: "Eventos", scrollTo: "#eventos", wait: 1000 },
  { url: "/login", name: "Inicio de Sesion", wait: 1500 },
  { url: "/register", name: "Registro de Atleta", wait: 1500 },
  { url: "/register-coach", name: "Registro de Coach", wait: 1500 },
  { url: "/dashboard", name: "Dashboard del Atleta", wait: 2500 },
  { url: "/profile", name: "Perfil del Usuario", wait: 1500 },
  { url: "/coach", name: "Panel de Coach", wait: 1500 },
];

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--allow-file-access-from-files", "--disable-web-security"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const screenshots = [];

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    console.log(`Capturing: ${p.name}...`);
    await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise((r) => setTimeout(r, p.wait));

    if (p.scrollTo) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
      }, p.scrollTo);
      await new Promise((r) => setTimeout(r, 500));
    }

    const filePath = path.join(SHOTS_DIR, `${i}.png`);
    await page.screenshot({ path: filePath, type: "png", fullPage: false });
    screenshots.push({ name: p.name, file: filePath });
  }

  // Also capture coach with a student selected
  console.log("Capturing: Coach con atleta seleccionado...");
  await page.goto(`${BASE}/coach`, { waitUntil: "networkidle2", timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.evaluate(() => {
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      if (btn.textContent.includes("Carlos")) {
        btn.click();
        break;
      }
    }
  });
  await new Promise((r) => setTimeout(r, 1000));
  const coachFile = path.join(SHOTS_DIR, `${pages.length}.png`);
  await page.screenshot({ path: coachFile, type: "png", fullPage: false });
  screenshots.push({ name: "Coach - Evaluacion de Atleta", file: coachFile });

  // Build image tags from file paths
  console.log("Generating PDF...");
  const img = (index) => `<img class="screenshot" src="file://${screenshots[index].file}">`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 40px 50px; size: A4; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; }
  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 90vh; text-align: center; }
  .cover h1 { font-size: 42px; font-weight: 900; margin-bottom: 8px; }
  .cover .brand { color: #16a34a; }
  .cover .subtitle { font-size: 20px; color: #666; margin-bottom: 40px; }
  .cover .badge { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; }
  .cover .meta { margin-top: 60px; font-size: 13px; color: #999; }
  h1 { font-size: 28px; font-weight: 900; margin-top: 0; }
  h2 { font-size: 22px; font-weight: 800; color: #16a34a; margin-top: 30px; border-bottom: 2px solid #dcfce7; padding-bottom: 8px; }
  h3 { font-size: 16px; font-weight: 700; margin-top: 20px; }
  p { font-size: 14px; margin: 8px 0; }
  ul { font-size: 14px; padding-left: 20px; }
  li { margin: 4px 0; }
  .screenshot { width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; margin: 16px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .page-break { page-break-before: always; }
  .section { margin-bottom: 20px; }
  .highlight { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 13px; }
  .impact-box { background: #fefce8; border: 1px solid #fde047; border-radius: 12px; padding: 16px; margin: 12px 0; }
  .impact-box h4 { margin: 0 0 8px 0; font-size: 14px; color: #854d0e; }
  .impact-box p { font-size: 13px; color: #713f12; margin: 4px 0; }
  .users-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  .users-table th { background: #f0fdf4; padding: 10px 12px; text-align: left; font-weight: 700; border-bottom: 2px solid #16a34a; }
  .users-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
  .footer { text-align: center; font-size: 11px; color: #999; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>

<div class="cover">
  <h1>IMA<span class="brand">SPORT</span></h1>
  <p class="subtitle">Plataforma Digital para Atletas y Coaches</p>
  <p class="badge">DOCUMENTO DE PRESENTACION — MOCKUP</p>
  <p class="meta">CrossFit | Hyrox | Calistenia<br>Morelia, Michoacan, Mexico<br><br>Agosto 2024</p>
</div>

<!-- Intro -->
<h1>Introduccion</h1>
<p>Este documento presenta la plataforma digital de <strong>IMASPORT</strong>, disenada para transformar la experiencia de nuestros atletas y optimizar el trabajo de nuestros coaches.</p>
<p>La plataforma es una <strong>aplicacion web moderna</strong> accesible desde cualquier dispositivo (celular, tablet, computadora) que permite a los usuarios hacer seguimiento de su progreso, agendar sesiones, y a los coaches evaluar atletas de forma digital.</p>

<div class="highlight">
<strong>Nota:</strong> Lo que se presenta aqui es un mockup funcional (prototipo visual) para demostrar las capacidades y el potencial de la plataforma. Los datos mostrados son ilustrativos.
</div>

<h2>Tipos de Usuarios</h2>
<table class="users-table">
<tr><th>Usuario</th><th>Descripcion</th><th>Que puede hacer</th></tr>
<tr><td><strong>Atleta</strong></td><td>Cualquier miembro del gym con plan activo</td><td>Ver progreso, agendar citas con coach, modificar perfil, inscribirse a eventos</td></tr>
<tr><td><strong>Coach</strong></td><td>Entrenador certificado de CrossFit, Hyrox o Calistenia</td><td>Evaluar atletas, tomar fotos, agregar notas, ver historial de sesiones</td></tr>
<tr><td><strong>Administrador</strong></td><td>Dueno/gerente del gym (fase futura)</td><td>Ver metricas del negocio, gestionar planes, gestionar coaches</td></tr>
</table>

<div class="impact-box">
<h4>Impacto Esperado</h4>
<p>• <strong>Retencion:</strong> Los atletas que ven su progreso se quedan 3x mas tiempo</p>
<p>• <strong>Diferenciacion:</strong> Ningun gym en Morelia ofrece analytics por disciplina</p>
<p>• <strong>Eficiencia:</strong> Coaches eliminan formularios de papel y fotos en WhatsApp</p>
<p>• <strong>Comunidad:</strong> Eventos integrados crean sentido de pertenencia</p>
<p>• <strong>Escalabilidad:</strong> Listo para multiples sucursales en el futuro</p>
</div>

<!-- Page sections with screenshots -->
<div class="page-break"></div>
<h1>Pantalla Principal</h1>
<p>La primera impresion del visitante. Disenada para comunicar inmediatamente que somos un gym de alto nivel con tres disciplinas unicas.</p>
${img(0)}
<h3>Que comunica:</h3>
<ul>
<li>Mensaje claro: "Entrena como atleta" — posicionamiento premium</li>
<li>Las tres disciplinas visibles de inmediato (CrossFit, Hyrox, Calistenia)</li>
<li>Numeros de comunidad (500+ atletas, 15+ coaches)</li>
<li>Llamada a la accion directa para registrarse</li>
</ul>

<div class="page-break"></div>
<h1>Servicios — Nuestros Programas</h1>
<p>Cada disciplina tiene su propia tarjeta con imagen e informacion, ayudando al visitante a entender que ofrecemos y elegir la que mas le interese.</p>
${img(1)}
<div class="impact-box">
<h4>Por que es importante</h4>
<p>El visitante puede comparar las tres disciplinas sin hablar con nadie. Esto reduce la friccion para nuevos prospectos que no conocen la diferencia entre CrossFit y Hyrox.</p>
</div>

<div class="page-break"></div>
<h1>Planes y Membresias</h1>
<p>Tres planes claramente diferenciados con precios y beneficios visibles. El plan recomendado se destaca visualmente.</p>
${img(2)}
<h3>Beneficio para el negocio:</h3>
<ul>
<li>El usuario puede elegir y pagar su plan sin necesidad de ir al gym</li>
<li>La estructura de tres niveles incentiva el upgrade al plan Pro o Elite</li>
<li>Transparencia total en precios genera confianza</li>
</ul>

<div class="page-break"></div>
<h1>Coaches</h1>
<p>Presentamos al equipo de entrenadores con su foto, nombre, disciplina y certificaciones. Genera confianza y muestra profesionalismo.</p>
${img(3)}

<h1>Eventos y Competencias</h1>
<p>Seccion de eventos proximos con filtro por disciplina. Los atletas pueden inscribirse directamente desde la plataforma.</p>
${img(4)}
<h3>Tipos de eventos:</h3>
<ul>
<li><strong>Simulaciones Hyrox</strong> — preparacion para competencia real</li>
<li><strong>CrossFit Open Workouts</strong> — WODs competitivos</li>
<li><strong>Workshops de Calistenia</strong> — talleres especializados</li>
<li><strong>Competencias internas</strong> — torneos por equipos</li>
<li><strong>Watch parties</strong> — eventos sociales de comunidad</li>
</ul>
<div class="impact-box">
<h4>Impacto en retencion</h4>
<p>Los eventos crean metas a corto plazo que mantienen a los atletas motivados y generan ingresos adicionales por inscripcion.</p>
</div>

<div class="page-break"></div>
<h1>Inicio de Sesion</h1>
<p>Pantalla limpia y simple para que los miembros accedan a su cuenta. Incluye opcion de inicio con Google para mayor comodidad.</p>
${img(5)}

<div class="page-break"></div>
<h1>Registro de Atleta</h1>
<p>El nuevo miembro se registra con sus datos, elige su disciplina principal y selecciona su plan de membresia, todo en un solo paso.</p>
${img(6)}
<h3>Que incluye:</h3>
<ul>
<li>Datos personales (nombre, email, telefono)</li>
<li>Seleccion de disciplina preferida</li>
<li>Eleccion de plan con precio visible</li>
<li>Link al registro de coach (para entrenadores)</li>
</ul>

<div class="page-break"></div>
<h1>Registro de Coach</h1>
<p>Los entrenadores tienen su propio formulario de registro con campos especificos para validar su experiencia y certificaciones.</p>
${img(7)}
<h3>Informacion que se solicita:</h3>
<ul>
<li>Disciplina principal (CrossFit, Hyrox o Calistenia)</li>
<li>Certificaciones profesionales</li>
<li>Anos de experiencia</li>
<li>Especialidad (Fuerza, Resistencia, Tecnica, Competencia)</li>
<li>Biografia profesional</li>
</ul>

<div class="page-break"></div>
<h1>Dashboard del Atleta — Panel de Progreso</h1>
<p>Esta es la pantalla mas importante para el atleta. Aqui ve todo su progreso de un vistazo, con analiticas separadas para cada programa.</p>
${img(8)}
<h3>Lo que el atleta puede ver:</h3>
<ul>
<li><strong>Estadisticas rapidas:</strong> sesiones del mes, racha, records personales, calorias</li>
<li><strong>Analiticas por programa</strong> (pestanas CrossFit / Hyrox / Calistenia):</li>
  <ul>
  <li>CrossFit: progresion de pesos, tiempos de WODs benchmark, perfil radar</li>
  <li>Hyrox: tiempos por estacion vs objetivo, simulaciones de carrera</li>
  <li>Calistenia: repeticiones, progresiones de skills (muscle-up, planche, etc.)</li>
  </ul>
<li><strong>Metricas corporales:</strong> evolucion de musculo y grasa</li>
<li><strong>Logros:</strong> insignias desbloqueadas por cumplir metas</li>
<li><strong>Proxima clase:</strong> reserva rapida</li>
</ul>
<div class="impact-box">
<h4>Por que esto es clave para el negocio</h4>
<p>Un atleta que ve su progreso semana a semana <strong>no cancela su membresia</strong>. Las graficas y logros crean un ciclo de motivacion que mantiene la asistencia constante. Esto se traduce directamente en mayor retencion y menos cancelaciones.</p>
</div>

<div class="page-break"></div>
<h1>Perfil del Usuario</h1>
<p>El atleta puede actualizar su informacion, registrar sus metricas corporales, definir objetivos, y agendar sesiones con coaches.</p>
${img(9)}
<h3>Funcionalidades:</h3>
<ul>
<li><strong>Editar informacion personal</strong> — nombre, email, telefono, edad</li>
<li><strong>Metricas corporales</strong> — peso, altura, % grasa (se grafican en el dashboard)</li>
<li><strong>Objetivos</strong> — el atleta elige sus metas y el coach las puede ver</li>
<li><strong>Agendar cita con coach</strong> — selecciona coach, tipo de sesion, fecha y hora</li>
<li><strong>Preferencias</strong> — notificaciones y recordatorios</li>
</ul>
<div class="highlight">
<strong>Agendar sesion con coach:</strong> El atleta puede pedir una evaluacion, entrenamiento personal, correccion de tecnica o planificacion de objetivos directamente desde la app, sin necesidad de WhatsApp o comunicacion informal.
</div>

<div class="page-break"></div>
<h1>Panel de Coach — Vista General</h1>
<p>Los coaches acceden a su panel desde una tablet. Ven la lista de atletas del dia y pueden seleccionar uno para evaluarlo.</p>
${img(10)}

<h2>Panel de Coach — Evaluando un Atleta</h2>
<p>Al seleccionar un atleta, el coach puede calificarlo, registrar metricas, tomar fotos y agregar comentarios.</p>
${img(11)}
<h3>Lo que puede hacer el coach:</h3>
<ul>
<li><strong>Calificar del 1 al 10</strong> en: Rendimiento, Tecnica y Esfuerzo</li>
<li><strong>Registrar metricas especificas</strong> segun la disciplina (pesos, tiempos, repeticiones)</li>
<li><strong>Tomar foto</strong> directamente desde la tablet</li>
<li><strong>Agregar notas</strong> sobre observaciones y recomendaciones</li>
<li><strong>Ver historial</strong> de evaluaciones anteriores</li>
</ul>
<div class="impact-box">
<h4>Beneficio operativo</h4>
<p>Se elimina: papel, pizarrones, fotos sueltas en WhatsApp, y Excel. Todo queda centralizado y el atleta puede ver los comentarios de su coach en su propio dashboard. Profesionaliza la operacion del gym.</p>
</div>

<div class="page-break"></div>
<h1>Funcionalidades Adicionales</h1>

<h2>Tema Oscuro / Claro</h2>
<p>La plataforma ofrece dos modos visuales. El tema oscuro es el predeterminado (aspecto premium/atletico) y el claro es optativo. El usuario cambia con un solo clic.</p>

<h2>Multi-idioma</h2>
<p>Toda la plataforma esta en espanol con soporte para ingles. Esto permite:</p>
<ul>
<li>Recibir atletas extranjeros sin barrera de idioma</li>
<li>Preparar la plataforma para expansion a otros mercados</li>
<li>Agregar mas idiomas en el futuro (portugues, por ejemplo)</li>
</ul>

<h2>Diseno Responsivo</h2>
<p>La plataforma se adapta automaticamente al dispositivo:</p>
<ul>
<li><strong>Celular:</strong> atletas consultan su progreso y agenda</li>
<li><strong>Tablet:</strong> coaches evaluan atletas durante la clase</li>
<li><strong>Computadora:</strong> experiencia completa con todas las graficas</li>
</ul>

<div class="page-break"></div>
<h1>Vision a Futuro</h1>
<p>Este mockup demuestra la base de la plataforma. Las siguientes fases incluirian:</p>

<h3>Fase 2 — Funcionalidad completa</h3>
<ul>
<li>Autenticacion real y base de datos</li>
<li>Procesamiento de pagos en linea</li>
<li>Notificaciones push (recordatorios de clase, logros)</li>
<li>Almacenamiento de fotos en la nube</li>
</ul>

<h3>Fase 3 — Crecimiento</h3>
<ul>
<li>App movil nativa (iOS/Android)</li>
<li>Panel de administracion (metricas del negocio, reportes financieros)</li>
<li>Integracion con wearables (Apple Watch, Garmin)</li>
<li>Leaderboards y retos semanales</li>
</ul>

<h3>Fase 4 — Escalamiento</h3>
<ul>
<li>Soporte multi-sucursal</li>
<li>Marketplace de planes y programas</li>
<li>Contenido on-demand (videos de tecnica)</li>
<li>Inteligencia artificial para programacion personalizada</li>
</ul>

<div class="page-break"></div>
<h1>Resumen Ejecutivo</h1>

<table class="users-table">
<tr><th>Aspecto</th><th>Beneficio</th></tr>
<tr><td>Dashboard por disciplina</td><td>Atletas ven progreso real → mayor retencion</td></tr>
<tr><td>Panel de Coach en tablet</td><td>Evaluaciones digitales → operacion profesional</td></tr>
<tr><td>Eventos integrados</td><td>Comunidad activa → mas inscripciones</td></tr>
<tr><td>Agenda de sesiones</td><td>Organizacion sin WhatsApp → menos cancelaciones</td></tr>
<tr><td>Multi-idioma</td><td>Preparados para expansion → mercado mas amplio</td></tr>
<tr><td>Planes visibles online</td><td>Conversion de prospectos → mas ventas</td></tr>
</table>

<div class="highlight">
<strong>Conclusion:</strong> La plataforma IMASPORT no es solo una pagina web — es una herramienta de retencion, diferenciacion y crecimiento que posiciona al gym como lider tecnologico en Morelia.
</div>

<div class="footer">
<p>IMASPORT — Athletes for Life ⚡<br>CrossFit | Hyrox | Calistenia<br>Morelia, Michoacan, Mexico<br><br>Documento generado automaticamente — Agosto 2024</p>
</div>

</body>
</html>`;

  const htmlFile = path.join(SHOTS_DIR, "guide.html");
  fs.writeFileSync(htmlFile, htmlContent, "utf8");
  const pdfPage = await browser.newPage();
  await pdfPage.goto(`file://${htmlFile}`, { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  await pdfPage.pdf({
    path: OUTPUT,
    format: "A4",
    printBackground: true,
    margin: { top: "40px", bottom: "40px", left: "50px", right: "50px" },
  });
  fs.unlinkSync(htmlFile);

  await browser.close();
  console.log(`\nPDF generated: ${OUTPUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
