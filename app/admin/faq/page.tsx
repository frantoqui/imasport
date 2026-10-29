import { requireRole } from "@/lib/dal";
import { FaqManager, type FaqRowData } from "@/components/admin/FaqManager";
import { ErrorBanner, PageHeader } from "@/components/admin/ui";
import { loadFaqs } from "../_lib/queries";

export default async function AdminFaqPage() {
  await requireRole("admin");

  const faqs = await loadFaqs();

  const rows: FaqRowData[] = faqs.items.map((faq) => ({
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    questionEn: faq.questionEn ?? null,
    answerEn: faq.answerEn ?? null,
    order: faq.order ?? null,
    published: faq.published === true,
    updatedAtKey: faq.updatedAt ?? "",
  }));

  return (
    <>
      <PageHeader
        title="Preguntas frecuentes"
        description="Se muestran en la portada, en el idioma que el visitante tenga seleccionado."
      />
      <ErrorBanner message={faqs.error} />
      <FaqManager faqs={rows} />
    </>
  );
}
