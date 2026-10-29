"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { uploadData } from "aws-amplify/storage";
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle,
  Images,
  Loader2,
  MessageSquare,
  Save,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { buildMediaKey, MEDIA_PREFIXES } from "@/lib/media";
import { createAthletePhotos, saveEvaluation } from "@/lib/member-actions";
import { parseClock, todayKey } from "./metrics";
import type { AthleteListRow, Discipline } from "./types";

/**
 * Coach evaluation form.
 *
 * Two things matter here beyond saving an `Evaluation`:
 *
 *  1. Every input is controlled. They were uncontrolled in the mock, so a
 *     coach's numbers vanished on submit.
 *  2. Each numeric reading also becomes a `ProgressEntry` row (done in the
 *     Server Action), keyed by the vocabulary documented in
 *     `components/member/metrics.ts`. That is what makes the athlete's
 *     dashboard charts move — an evaluation that only wrote `Evaluation.metrics`
 *     would be invisible to them.
 *
 * The layout stays tablet-first: large rating buttons, roomy inputs, and a
 * capture control that opens the rear camera.
 */

const DISCIPLINES: Discipline[] = ["CrossFit", "Hyrox", "Calistenia"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

type Field = {
  metric: string;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
};

type Group = {
  title: string;
  hint?: string;
  fields: Field[];
};

const score = (metric: string, label: string): Field => ({
  metric,
  label,
  min: 0,
  max: 100,
  step: 1,
  placeholder: "0-100",
});

const GROUPS: Record<Discipline, Group[]> = {
  CrossFit: [
    {
      title: "Levantamientos (kg)",
      hint: "1RM o el mejor del día.",
      fields: [
        { metric: "squat", label: "Back Squat", step: 0.5, placeholder: "120" },
        { metric: "deadlift", label: "Deadlift", step: 0.5, placeholder: "140" },
        { metric: "clean", label: "Clean", step: 0.5, placeholder: "85" },
        { metric: "snatch", label: "Snatch", step: 0.5, placeholder: "67" },
      ],
    },
    {
      title: "Perfil de rendimiento (0-100)",
      hint: "Alimenta la gráfica de radar del atleta.",
      fields: [
        score("strength", "Fuerza"),
        score("gymnastics", "Gimnasia"),
        score("cardio", "Cardio"),
        score("weightlifting", "Halterofilia"),
        score("mobility", "Movilidad"),
        score("power", "Potencia"),
      ],
    },
  ],
  Hyrox: [
    {
      title: "Tiempos por estación (min)",
      hint: "Minutos con decimales, p. ej. 4.2",
      fields: [
        { metric: "skiErg", label: "SkiErg", step: 0.1, placeholder: "4.2" },
        { metric: "sledPush", label: "Sled Push", step: 0.1, placeholder: "3.5" },
        { metric: "sledPull", label: "Sled Pull", step: 0.1, placeholder: "3.8" },
        { metric: "burpees", label: "Burpees", step: 0.1, placeholder: "4.0" },
        { metric: "row", label: "Row", step: 0.1, placeholder: "4.5" },
        { metric: "farmers", label: "Farmers", step: 0.1, placeholder: "2.8" },
        { metric: "lunges", label: "Lunges", step: 0.1, placeholder: "5.2" },
        { metric: "wallBalls", label: "Wall Balls", step: 0.1, placeholder: "4.8" },
      ],
    },
    {
      title: "Simulación de carrera (min)",
      hint: "El total de la simulación se calcula solo.",
      fields: [
        { metric: "raceRunning", label: "Running", step: 0.1, placeholder: "38" },
        {
          metric: "raceStations",
          label: "Estaciones",
          step: 0.1,
          placeholder: "34",
        },
      ],
    },
    {
      title: "Perfil de rendimiento (0-100)",
      fields: [
        score("running", "Running"),
        score("skiErgScore", "SkiErg"),
        score("sledScore", "Sled"),
        score("burpeesScore", "Burpees"),
        score("rowScore", "Row"),
        score("wallBallsScore", "Wall Balls"),
      ],
    },
  ],
  Calistenia: [
    {
      title: "Repeticiones máximas",
      fields: [
        { metric: "pullups", label: "Pull-ups", step: 1, placeholder: "17" },
        { metric: "dips", label: "Dips", step: 1, placeholder: "25" },
        { metric: "hspu", label: "HSPU", step: 1, placeholder: "10" },
        { metric: "muscleup", label: "Muscle-up", step: 1, placeholder: "3" },
      ],
    },
    {
      title: "Nivel de habilidad (1-5)",
      fields: [
        { metric: "muscleUpLevel", label: "Muscle-Up", min: 1, max: 5, step: 1 },
        {
          metric: "handstandPushupLevel",
          label: "Handstand Push-up",
          min: 1,
          max: 5,
          step: 1,
        },
        {
          metric: "frontLeverLevel",
          label: "Front Lever",
          min: 1,
          max: 5,
          step: 1,
        },
        { metric: "planacheLevel", label: "Planche", min: 1, max: 5, step: 1 },
      ],
    },
    {
      title: "Perfil de rendimiento (0-100)",
      fields: [
        score("push", "Push"),
        score("pull", "Pull"),
        score("core", "Core"),
        score("legs", "Piernas"),
        score("skills", "Skills"),
        score("holds", "Holds"),
      ],
    },
  ],
};

type Photo = {
  /** Local id, so a thumbnail can be removed before it finishes uploading. */
  id: string;
  previewUrl: string;
  key: string | null;
  uploading: boolean;
  error: string | null;
};

/**
 * "Fran" -> "wodFran". The chart treats any `wod<Name>` key as a benchmark,
 * so the name has to start with a letter once sanitized.
 */
function wodMetricKey(name: string): string | null {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned || !/^[a-zA-Z]/.test(cleaned)) return null;
  return `wod${cleaned[0].toUpperCase()}${cleaned.slice(1)}`;
}

export default function EvaluationForm({
  athlete,
  onSaved,
}: {
  athlete: AthleteListRow;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  const [discipline, setDiscipline] = useState<Discipline>(
    athlete.discipline ?? "CrossFit"
  );
  const [date, setDate] = useState(todayKey());
  const [rating, setRating] = useState({
    performance: 8,
    technique: 7,
    effort: 9,
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [wodName, setWodName] = useState("");
  const [wodTime, setWodTime] = useState("");
  const [notes, setNotes] = useState("");
  const [caption, setCaption] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);

  // A new athlete means a clean sheet; keeping the previous numbers around
  // would be the fastest way to record a reading against the wrong person.
  useEffect(() => {
    setDiscipline(athlete.discipline ?? "CrossFit");
    setValues({});
    setWodName("");
    setWodTime("");
    setNotes("");
    setCaption("");
    setPhotos([]);
    setStatus(null);
  }, [athlete.userId, athlete.discipline]);

  // Previews are revoked only on unmount. Keying the cleanup on `photos`
  // would revoke the URLs of thumbnails that are still on screen every time
  // the list changed.
  const photosRef = useRef<Photo[]>([]);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    },
    []
  );

  const setValue = (metric: string, value: string) =>
    setValues((prev) => ({ ...prev, [metric]: value }));

  const uploadedKeys = photos
    .filter((photo) => photo.key)
    .map((photo) => ({ key: photo.key as string, caption: caption || null }));
  const uploadsPending = photos.some((photo) => photo.uploading);

  async function handleFiles(files: FileList) {
    const accepted = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) return false;
      return file.size <= MAX_PHOTO_BYTES;
    });

    if (accepted.length < files.length) {
      setStatus({
        kind: "error",
        message: "Se ignoraron archivos que no son imágenes o pesan más de 10 MB.",
      });
    }

    for (const file of accepted) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPhotos((prev) => [
        ...prev,
        { id, previewUrl, key: null, uploading: true, error: null },
      ]);

      const key = buildMediaKey(MEDIA_PREFIXES.athletePhotos, file.name);
      try {
        await uploadData({
          path: key,
          data: file,
          options: { contentType: file.type },
        }).result;
        setPhotos((prev) =>
          prev.map((photo) =>
            photo.id === id ? { ...photo, key, uploading: false } : photo
          )
        );
      } catch (cause) {
        setPhotos((prev) =>
          prev.map((photo) =>
            photo.id === id
              ? {
                  ...photo,
                  uploading: false,
                  error:
                    cause instanceof Error ? cause.message : "Error al subir",
                }
              : photo
          )
        );
      }
    }

    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((photo) => photo.id !== id);
    });
  }

  function collectMetrics(): {
    metrics: Record<string, number>;
    extras: Record<string, string>;
    warning: string | null;
  } {
    const metrics: Record<string, number> = {};
    const extras: Record<string, string> = {};
    let warning: string | null = null;

    for (const group of GROUPS[discipline]) {
      for (const field of group.fields) {
        const raw = values[field.metric];
        if (raw === undefined || raw.trim() === "") continue;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) continue;
        metrics[field.metric] = parsed;
      }
    }

    if (discipline === "CrossFit" && (wodName.trim() || wodTime.trim())) {
      const key = wodMetricKey(wodName);
      const seconds = parseClock(wodTime);
      if (key && seconds !== null) {
        metrics[key] = seconds;
        extras.wodName = wodName.trim();
        extras.wodTime = wodTime.trim();
      } else {
        warning =
          "El WOD necesita un nombre que empiece con letra y un tiempo tipo 9:12 — se guardará sin él.";
      }
    }

    return { metrics, extras, warning };
  }

  function handleSave() {
    setStatus(null);
    const { metrics, extras, warning } = collectMetrics();

    startSaving(async () => {
      const result = await saveEvaluation({
        athleteId: athlete.userId,
        date,
        discipline,
        performance: rating.performance,
        technique: rating.technique,
        effort: rating.effort,
        notes,
        metrics,
        extras,
        photos: uploadedKeys,
      });

      if (result.ok) {
        const count = result.data.progressCreated;
        setStatus({
          kind: "ok",
          message:
            `Evaluación guardada${
              count > 0 ? ` • ${count} métrica${count === 1 ? "" : "s"} al historial del atleta` : ""
            }` + (warning ? ` — ${warning}` : ""),
        });
        setValues({});
        setWodName("");
        setWodTime("");
        setNotes("");
        setCaption("");
        setPhotos((prev) => {
          for (const photo of prev) URL.revokeObjectURL(photo.previewUrl);
          return [];
        });
        onSaved();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  function handleSavePhotosOnly() {
    setStatus(null);
    startSaving(async () => {
      const result = await createAthletePhotos(
        athlete.userId,
        uploadedKeys,
        date
      );
      if (result.ok) {
        setStatus({
          kind: "ok",
          message: `${result.data.created} foto${
            result.data.created === 1 ? "" : "s"
          } guardada${result.data.created === 1 ? "" : "s"}.`,
        });
        setCaption("");
        setPhotos((prev) => {
          for (const photo of prev) URL.revokeObjectURL(photo.previewUrl);
          return [];
        });
        onSaved();
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  const initials = athlete.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          {t.coach.evaluationForm}
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
            {initials || "?"}
          </div>
          <div>
            <div className="text-sm font-bold">{athlete.name}</div>
            <div className="text-xs text-muted-foreground">
              {athlete.discipline ?? "Sin disciplina"}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Discipline + date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2" htmlFor="eval-discipline">
              Disciplina evaluada
            </label>
            <select
              id="eval-discipline"
              value={discipline}
              onChange={(event) =>
                setDiscipline(event.target.value as Discipline)
              }
              className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary outline-none transition-all"
            >
              {DISCIPLINES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2" htmlFor="eval-date">
              Fecha
            </label>
            <input
              id="eval-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        {/* Ratings — deliberately large touch targets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              { key: "performance", label: t.coach.performance },
              { key: "technique", label: t.coach.technique },
              { key: "effort", label: t.coach.effort },
            ] as const
          ).map((metric) => (
            <div key={metric.key} className="bg-muted rounded-xl p-4">
              <label className="block text-sm font-medium mb-3">
                {metric.label}
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${metric.label}: ${n}`}
                    onClick={() =>
                      setRating((prev) => ({ ...prev, [metric.key]: n }))
                    }
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                      n <= rating[metric.key]
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="text-center mt-2 text-2xl font-black text-primary">
                {rating[metric.key]}/10
              </div>
            </div>
          ))}
        </div>

        {/* Discipline-specific metrics */}
        {GROUPS[discipline].map((group) => (
          <div key={group.title} className="bg-muted rounded-xl p-4">
            <label className="block text-sm font-bold mb-1">{group.title}</label>
            {group.hint && (
              <p className="text-xs text-muted-foreground mb-3">{group.hint}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {group.fields.map((field) => (
                <div key={field.metric}>
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor={`eval-${field.metric}`}
                  >
                    {field.label}
                  </label>
                  <input
                    id={`eval-${field.metric}`}
                    type="number"
                    inputMode="decimal"
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={values[field.metric] ?? ""}
                    onChange={(event) =>
                      setValue(field.metric, event.target.value)
                    }
                    placeholder={field.placeholder}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {discipline === "CrossFit" && (
          <div className="bg-muted rounded-xl p-4">
            <label className="block text-sm font-bold mb-1">Benchmark WOD</label>
            <p className="text-xs text-muted-foreground mb-3">
              Se guarda como récord del atleta, p. ej. Fran en 4:32.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground" htmlFor="eval-wod-name">
                  Nombre del WOD
                </label>
                <input
                  id="eval-wod-name"
                  type="text"
                  value={wodName}
                  onChange={(event) => setWodName(event.target.value)}
                  placeholder="Fran"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground" htmlFor="eval-wod-time">
                  Tiempo
                </label>
                <input
                  id="eval-wod-time"
                  type="text"
                  value={wodTime}
                  onChange={(event) => setWodTime(event.target.value)}
                  placeholder="4:32"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Photo capture */}
        <div className="bg-muted rounded-xl p-4">
          <label className="block text-sm font-bold mb-3">
            {t.coach.takePhoto}
          </label>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-xl overflow-hidden border border-border bg-background"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt="Foto capturada"
                    className="w-full h-full object-cover"
                  />
                  {photo.uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-white" />
                    </div>
                  )}
                  {photo.error && (
                    <div className="absolute inset-0 bg-destructive/70 flex items-center justify-center p-1 text-[10px] text-white text-center">
                      {photo.error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    aria-label="Quitar foto"
                    className="absolute top-1 right-1 p-1.5 rounded-lg bg-background/90 hover:text-destructive"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Camera size={32} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Toca para tomar foto o subir imagen
            </span>
          </button>
          {/* `capture` makes a tablet open the rear camera straight away. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = event.target.files;
              if (files && files.length > 0) void handleFiles(files);
            }}
          />

          {photos.length > 0 && (
            <div className="mt-3 space-y-3">
              <div>
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="eval-caption"
                >
                  Descripción de las fotos
                </label>
                <input
                  id="eval-caption"
                  type="text"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Técnica de sentadilla, vista lateral"
                  className="w-full mt-1 px-3 py-2.5 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSavePhotosOnly}
                disabled={saving || uploadsPending || uploadedKeys.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border font-medium hover:bg-background transition-colors disabled:opacity-60"
              >
                <Images size={16} />
                Guardar solo las fotos
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label
            className="text-sm font-bold mb-2 flex items-center gap-2"
            htmlFor="eval-notes"
          >
            <MessageSquare size={14} className="text-primary" />
            {t.coach.notes}
          </label>
          <textarea
            id="eval-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none resize-none"
            rows={4}
            placeholder="Observaciones sobre técnica, progreso, recomendaciones..."
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploadsPending}
          className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors text-lg disabled:opacity-70"
        >
          {saving ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {uploadsPending ? "Subiendo fotos…" : t.coach.saveEvaluation}
        </button>

        {status && (
          <div
            className={`flex items-start gap-2 p-4 rounded-xl ${
              status.kind === "ok"
                ? "bg-green-500/10 border border-green-500/20 text-green-600"
                : "bg-destructive/10 border border-destructive/20 text-destructive"
            }`}
          >
            {status.kind === "ok" ? (
              <CheckCircle size={18} className="shrink-0" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <span className="font-medium">{status.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
