import { requireRole } from "@/lib/dal";
import { userClient } from "@/lib/amplify-server";
import {
  SiteSettingSection,
  type SettingField,
} from "@/components/admin/SiteSettingsForm";
import { SETTING_KEYS, parseJsonValue } from "@/components/admin/types";
import { ErrorBanner, PageHeader } from "@/components/admin/ui";

/**
 * Editor for the bits of the marketing site that used to be hardcoded.
 *
 * Each key stores one JSON object. The rows already exist in the deployed
 * database, so this page reads them with `get({ key })` and updates in place —
 * `SiteSetting` is identified by `key`, so a create would collide rather than
 * duplicate, but the action still falls back to creating when a key is missing.
 */

const SECTIONS: {
  key: string;
  title: string;
  description: string;
  fields: SettingField[];
}[] = [
  {
    key: SETTING_KEYS.contact,
    title: "Datos de contacto",
    description:
      "Se usan en el pie de página y en la sección de contacto de la portada.",
    fields: [
      { name: "phone", label: "Teléfono", type: "tel", placeholder: "+52 443 123 4567" },
      {
        name: "email",
        label: "Correo",
        type: "email",
        placeholder: "hola@imasport.mx",
      },
      {
        name: "address",
        label: "Dirección",
        placeholder: "Av. Camelinas 1234, Morelia, Mich.",
      },
      {
        name: "instagram",
        label: "Instagram",
        placeholder: "imasport.mx",
        hint: "Usuario o URL, como lo quieras mostrar.",
      },
      { name: "facebook", label: "Facebook", placeholder: "imasportmx" },
    ],
  },
  {
    key: SETTING_KEYS.heroStats,
    title: "Números del hero",
    description:
      "Las tres cifras que se muestran bajo el título principal de la portada.",
    fields: [
      {
        name: "athletes",
        label: "Atletas",
        placeholder: "500+",
        hint: "Texto libre; se muestra tal cual.",
      },
      { name: "coaches", label: "Coaches", placeholder: "12" },
      { name: "disciplines", label: "Disciplinas", placeholder: "3" },
    ],
  },
  {
    key: SETTING_KEYS.hero,
    title: "Hero",
    description: "La etiqueta pequeña que aparece arriba del título.",
    fields: [
      {
        name: "badge",
        label: "Badge",
        placeholder: "Athletes for Life",
      },
    ],
  },
];

export default async function AdminContentPage() {
  await requireRole("admin");

  const results = await Promise.all(
    SECTIONS.map(async (section) => {
      const { data, errors } = await userClient.models.SiteSetting.get({
        key: section.key,
      });

      // The stored value is a JSON string. A malformed row must not take the
      // page down, so it degrades to empty fields plus a visible warning.
      const parsed = parseJsonValue<Record<string, unknown>>(data?.value);
      const values: Record<string, string> = {};
      if (parsed && typeof parsed === "object") {
        for (const [field, value] of Object.entries(parsed)) {
          values[field] =
            value === null || value === undefined ? "" : String(value);
        }
      }

      return {
        section,
        exists: Boolean(data),
        malformed: Boolean(data?.value) && parsed === null,
        values,
        error:
          errors && errors.length > 0
            ? errors.map((e) => e.message).join(" · ")
            : null,
      };
    })
  );

  const errors = results
    .map((result) => result.error)
    .filter((error): error is string => typeof error === "string");

  return (
    <>
      <PageHeader
        title="Contenido del sitio"
        description="Textos y datos que antes estaban escritos en el código."
      />

      {errors.length > 0 ? <ErrorBanner message={errors.join("\n")} /> : null}

      <div className="space-y-6">
        {results.map((result) => (
          <div key={result.section.key}>
            {result.malformed ? (
              <ErrorBanner
                message={`El valor guardado en «${result.section.key}» no es JSON válido. Los campos salen vacíos; al guardar se sobrescribe.`}
              />
            ) : null}
            <SiteSettingSection
              settingKey={result.section.key}
              title={result.section.title}
              description={result.section.description}
              fields={result.section.fields}
              initial={result.values}
              exists={result.exists}
            />
          </div>
        ))}
      </div>
    </>
  );
}
