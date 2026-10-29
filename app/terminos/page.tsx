import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Términos y Condiciones | IMASPORT",
  description:
    "Términos y condiciones de uso de IMASPORT: membresías, clases, eventos y responsabilidades.",
};

const SECTIONS: Array<{ title: string; paragraphs: string[] }> = [
  {
    title: "1. Aceptación de los términos",
    paragraphs: [
      "Al crear una cuenta, contratar una membresía o utilizar cualquier servicio de IMASPORT (el “Gimnasio”), aceptas estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguno de ellos, te pedimos no utilizar la plataforma ni las instalaciones.",
      "Estos términos pueden actualizarse. Publicaremos la versión vigente en esta página e informaremos de cualquier cambio relevante a través de la plataforma o por correo electrónico.",
    ],
  },
  {
    title: "2. Cuenta de usuario",
    paragraphs: [
      "Eres responsable de la información que registras y de mantener la confidencialidad de tu contraseña. Avísanos de inmediato si detectas un uso no autorizado de tu cuenta.",
      "La información de salud, medidas y objetivos que capturas es utilizada únicamente para darle seguimiento a tu entrenamiento y para que tu coach pueda evaluarte.",
    ],
  },
  {
    title: "3. Membresías y pagos",
    paragraphs: [
      "Las membresías se contratan por periodos mensuales y se renuevan de acuerdo con el plan seleccionado. Los precios mostrados en la plataforma están expresados en pesos mexicanos (MXN) e incluyen impuestos cuando así se indique.",
      "La cancelación de una membresía debe solicitarse antes del siguiente periodo de cobro. Los periodos ya pagados no son reembolsables salvo que la ley aplicable indique lo contrario.",
    ],
  },
  {
    title: "4. Solicitudes de coach",
    paragraphs: [
      "El registro como coach es una solicitud. La cuenta se crea con perfil de atleta y un administrador revisa las certificaciones y la experiencia declaradas antes de aprobar el acceso al Panel Coach.",
      "IMASPORT puede rechazar o revocar una solicitud de coach cuando la información proporcionada no pueda verificarse.",
    ],
  },
  {
    title: "5. Uso de las instalaciones y riesgo asumido",
    paragraphs: [
      "El entrenamiento de alta intensidad implica riesgo de lesión. Declaras que te encuentras en condiciones físicas adecuadas para entrenar y que informarás a tu coach de cualquier condición médica relevante.",
      "Debes seguir las indicaciones del personal, respetar los horarios reservados y cuidar el equipo. El mal uso del equipo o la conducta que ponga en riesgo a otras personas puede derivar en la suspensión de la membresía.",
    ],
  },
  {
    title: "6. Eventos y competencias",
    paragraphs: [
      "Las inscripciones a eventos están sujetas a disponibilidad de lugares. Cuando un evento tenga costo, se indicará al momento de la inscripción.",
      "IMASPORT puede reprogramar o cancelar un evento por causas de fuerza mayor, informando a las personas inscritas con la mayor antelación posible.",
    ],
  },
  {
    title: "7. Fotografía y contenido",
    paragraphs: [
      "Durante clases y eventos pueden tomarse fotografías y video con fines de difusión de la comunidad. Puedes solicitar en cualquier momento que no se publique material en el que apareces.",
      "Las fotografías de seguimiento que tu coach captura durante una evaluación son privadas y solo son visibles para ti, tu coach y la administración.",
    ],
  },
  {
    title: "8. Limitación de responsabilidad",
    paragraphs: [
      "IMASPORT no será responsable por daños indirectos derivados del uso de la plataforma, ni por la pérdida de objetos personales dentro de las instalaciones.",
      "Nada en estos términos limita los derechos que te correspondan como consumidor conforme a la legislación mexicana aplicable.",
    ],
  },
  {
    title: "9. Contacto y legislación aplicable",
    paragraphs: [
      "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos, con jurisdicción en Morelia, Michoacán.",
      "Para cualquier duda sobre estos términos escríbenos a info@imasports.mx.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-black">Términos y Condiciones</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Última actualización: 29 de octubre de 2026
            </p>
          </header>

          <div className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-8">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              <strong className="font-bold">Borrador.</strong> Este texto es un
              marcador de posición redactado para desarrollo y{" "}
              <strong className="font-bold">
                no ha sido revisado legalmente
              </strong>
              . Debe sustituirse por la versión que apruebe el área legal antes
              de salir a producción.
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
            Consulta también la{" "}
            <Link href="/privacidad" className="text-primary hover:underline">
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
