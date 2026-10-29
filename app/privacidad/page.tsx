import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Política de Privacidad | IMASPORT",
  description:
    "Cómo IMASPORT recaba, usa y protege tus datos personales y tus datos de entrenamiento.",
};

const SECTIONS: Array<{ title: string; paragraphs: string[] }> = [
  {
    title: "1. Responsable del tratamiento",
    paragraphs: [
      "IMASPORT, con domicilio en Morelia, Michoacán, México, es responsable del tratamiento de los datos personales que nos proporcionas a través de esta plataforma y en nuestras instalaciones.",
      "Puedes contactarnos en info@imasports.mx para cualquier asunto relacionado con tus datos personales.",
    ],
  },
  {
    title: "2. Datos que recabamos",
    paragraphs: [
      "Datos de identificación y contacto: nombre, correo electrónico y teléfono, que capturas al crear tu cuenta.",
      "Datos de entrenamiento y salud: disciplina, objetivos, peso, estatura, edad, porcentaje de grasa corporal, métricas de progreso y las evaluaciones que registra tu coach.",
      "Datos de membresía: plan contratado, estado de pago y fecha de ingreso.",
      "Datos de solicitud de coach, cuando aplica: certificaciones, años de experiencia, especialidad y biografía profesional.",
      "Imágenes: tu foto de perfil y, en su caso, las fotografías de seguimiento que tu coach captura durante una evaluación.",
    ],
  },
  {
    title: "3. Para qué usamos tus datos",
    paragraphs: [
      "Para darte acceso a tu cuenta, administrar tu membresía y permitirte inscribirte a clases y eventos.",
      "Para que tu coach pueda evaluarte, darte seguimiento y ajustar tu programa de entrenamiento.",
      "Para enviarte avisos operativos sobre clases, entrenamientos y el resumen semanal, de acuerdo con las preferencias de notificación que configures en tu perfil.",
      "Para cumplir obligaciones fiscales y legales relacionadas con los pagos de membresía.",
    ],
  },
  {
    title: "4. Quién puede ver tus datos",
    paragraphs: [
      "Tus datos de entrenamiento son visibles para ti, para los coaches del gimnasio y para la administración. No se muestran a otras personas que entrenan contigo.",
      "Las fotografías de seguimiento son privadas: solo tú, los coaches y la administración pueden consultarlas.",
      "El contenido público del sitio (eventos, galerías públicas, planes y tarjetas de coach) es visible para cualquier visitante.",
    ],
  },
  {
    title: "5. Encargados y transferencias",
    paragraphs: [
      "La plataforma se apoya en Amazon Web Services para autenticación, base de datos y almacenamiento de archivos. Dichos servicios actúan como encargados del tratamiento y pueden alojar la información en servidores ubicados fuera de México.",
      "No vendemos ni rentamos tus datos personales a terceros.",
    ],
  },
  {
    title: "6. Conservación y seguridad",
    paragraphs: [
      "Conservamos tus datos mientras tu cuenta esté activa y durante los plazos que exija la normativa fiscal y contable aplicable.",
      "Las contraseñas no se almacenan en nuestra base de datos: la autenticación se gestiona mediante Amazon Cognito. El acceso a la información está restringido por rol (atleta, coach, administrador).",
    ],
  },
  {
    title: "7. Tus derechos (ARCO)",
    paragraphs: [
      "Puedes solicitar el acceso, la rectificación, la cancelación o la oposición al tratamiento de tus datos personales, así como revocar tu consentimiento, escribiendo a info@imasports.mx.",
      "Varias de estas acciones puedes realizarlas directamente desde tu perfil: actualizar tus datos, modificar tus objetivos y ajustar tus preferencias de notificación.",
    ],
  },
  {
    title: "8. Cookies y almacenamiento local",
    paragraphs: [
      "Usamos cookies estrictamente necesarias para mantener tu sesión iniciada. Sin ellas no es posible acceder a tu panel.",
      "Durante el registro guardamos temporalmente en tu navegador los datos del formulario para poder crear tu perfil al confirmar tu correo. Esa información se borra en cuanto el perfil queda creado.",
    ],
  },
  {
    title: "9. Cambios a esta política",
    paragraphs: [
      "Publicaremos en esta página cualquier modificación a la presente política e informaremos de los cambios relevantes a través de la plataforma o por correo electrónico.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-black">Política de Privacidad</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Última actualización: 29 de octubre de 2026
            </p>
          </header>

          <div className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-8">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              <strong className="font-bold">Borrador.</strong> Este aviso de
              privacidad es un marcador de posición redactado para desarrollo y{" "}
              <strong className="font-bold">
                no ha sido revisado legalmente
              </strong>
              . Debe sustituirse por el aviso que apruebe el área legal antes de
              salir a producción.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-lg font-bold">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            Consulta también los{" "}
            <Link href="/terminos" className="text-primary hover:underline">
              Términos y Condiciones
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
