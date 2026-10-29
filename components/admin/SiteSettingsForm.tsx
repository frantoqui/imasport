"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { saveSiteSetting } from "@/lib/admin-actions";
import { useAdminAction } from "./useAdminAction";
import {
  ErrorBanner,
  Field,
  SuccessBanner,
  cardClass,
  inputClass,
  primaryBtnSmClass,
} from "./ui";

/**
 * Editor for one `SiteSetting` row.
 *
 * `SiteSetting` is identified by `key` and its `value` is `a.json()` — which
 * maps to the AppSync `AWSJSON` scalar, so the Server Action stringifies the
 * object before writing it. The fields are a fixed list per key, matching the
 * shape the marketing pages read; an unexpected extra key in the stored JSON
 * is dropped on save rather than silently preserved, which keeps the shape
 * predictable.
 */
export type SettingField = {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: "text" | "email" | "tel";
};

export function SiteSettingSection({
  settingKey,
  title,
  description,
  fields,
  initial,
  exists,
}: {
  settingKey: string;
  title: string;
  description: string;
  fields: SettingField[];
  initial: Record<string, string>;
  /** False when the row is missing and will be created on first save. */
  exists: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const seeded: Record<string, string> = {};
    for (const field of fields) seeded[field.name] = initial[field.name] ?? "";
    return seeded;
  });
  const { pending, error, message, run } = useAdminAction();

  return (
    <div className={cardClass}>
      <div className="mb-4">
        <h2 className="font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Clave: <code>{settingKey}</code>
          {exists ? "" : " · todavía no existe, se creará al guardar"}
        </p>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={message} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <Field key={field.name} label={field.label} hint={field.hint}>
            <input
              type={field.type ?? "text"}
              value={values[field.name] ?? ""}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
              }
              placeholder={field.placeholder}
              className={inputClass}
            />
          </Field>
        ))}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => void run(() => saveSiteSetting(settingKey, values))}
        className={`${primaryBtnSmClass} mt-5`}
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Save size={14} />
        )}
        Guardar
      </button>
    </div>
  );
}
