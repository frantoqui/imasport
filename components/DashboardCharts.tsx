"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Scale, Dumbbell, Timer, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  CALISTENIA_RADAR,
  CALISTENIA_REPS,
  CROSSFIT_LIFTS,
  CROSSFIT_RADAR,
  HYROX_RADAR,
  benchmarkSeries,
  bodySeries,
  groupByMetric,
  monthlySeries,
  raceSeries,
  radarSeries,
  skillSeries,
  stationSeries,
  weeklySeries,
} from "@/components/member/metrics";
import type {
  BodyMetricRow,
  Discipline,
  ProgressRow,
  WorkoutRow,
} from "@/components/member/types";

/**
 * Every series on this page is derived from real `ProgressEntry` and
 * `BodyMetric` rows. The `metric` keys each chart looks for are documented at
 * the top of `components/member/metrics.ts` — that comment is the contract a
 * seed script or import job has to match.
 *
 * A chart with no rows behind it is hidden behind a short note instead of
 * rendering an axis with nothing on it, because an empty axis reads as a bug.
 */

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
};

const tabs = [
  { key: "CrossFit", label: "CrossFit", icon: Dumbbell, color: "#ef4444" },
  { key: "Hyrox", label: "Hyrox", icon: Timer, color: "#eab308" },
  { key: "Calistenia", label: "Calistenia", icon: Target, color: "#22c55e" },
] as const;

function NoData({ hint }: { hint?: string }) {
  return (
    <div className="h-[220px] flex flex-col items-center justify-center text-center gap-1">
      <span className="text-sm text-muted-foreground">Aún no hay datos</span>
      {hint && (
        <span className="text-xs text-muted-foreground/70 max-w-[240px]">
          {hint}
        </span>
      )}
    </div>
  );
}

function ChartCard({
  title,
  icon,
  wide,
  children,
}: {
  title: string;
  icon?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-6 ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Legend({
  items,
}: {
  items: { label: string; color: string; bar?: boolean; faded?: boolean }[];
}) {
  return (
    <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <div
            className={item.bar ? "w-3 h-3 rounded" : "w-3 h-0.5 rounded"}
            style={{
              background: item.color,
              opacity: item.faded ? 0.4 : 1,
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

const LIFT_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7"];
const REP_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#ef4444"];

export default function DashboardCharts({
  progress,
  workouts,
  bodyMetrics,
  initialDiscipline,
}: {
  progress: ProgressRow[];
  workouts: WorkoutRow[];
  bodyMetrics: BodyMetricRow[];
  /** The athlete's own discipline opens first when they have one. */
  initialDiscipline?: Discipline | null;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Discipline>(
    initialDiscipline ?? "CrossFit"
  );

  const series = useMemo(() => {
    const byDiscipline = (discipline: Discipline) =>
      groupByMetric(progress.filter((row) => row.discipline === discipline));

    const crossfit = byDiscipline("CrossFit");
    const hyrox = byDiscipline("Hyrox");
    const calistenia = byDiscipline("Calistenia");

    return {
      crossfit: {
        lifts: monthlySeries(crossfit, CROSSFIT_LIFTS),
        radar: radarSeries(crossfit, CROSSFIT_RADAR),
        benchmarks: benchmarkSeries(crossfit),
        weekly: weeklySeries(workouts, "CrossFit"),
      },
      hyrox: {
        stations: stationSeries(hyrox),
        radar: radarSeries(hyrox, HYROX_RADAR),
        races: raceSeries(hyrox),
      },
      calistenia: {
        reps: monthlySeries(calistenia, CALISTENIA_REPS),
        radar: radarSeries(calistenia, CALISTENIA_RADAR),
        skills: skillSeries(calistenia),
      },
      body: bodySeries(bodyMetrics),
    };
  }, [progress, workouts, bodyMetrics]);

  const activeLifts = series.crossfit.lifts;
  const bestRace =
    series.hyrox.races.length > 0
      ? series.hyrox.races.reduce((best, race) =>
          race.total < best.total ? race : best
        )
      : null;
  const firstRace = series.hyrox.races[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Program Tabs */}
      <div className="flex items-center gap-2 p-1 bg-card border border-border rounded-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-lg"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CrossFit Analytics */}
      {activeTab === "CrossFit" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Progresión de Levantamientos (kg)"
            icon={<TrendingUp size={18} className="text-red-500" />}
          >
            {activeLifts.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={activeLifts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {CROSSFIT_LIFTS.map((lift, i) => (
                      <Line
                        key={lift}
                        type="monotone"
                        dataKey={lift}
                        stroke={LIFT_COLORS[i]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name={lift}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <Legend
                  items={[
                    { label: "Sentadilla", color: LIFT_COLORS[0] },
                    { label: "Peso Muerto", color: LIFT_COLORS[1] },
                    { label: "Clean", color: LIFT_COLORS[2] },
                    { label: "Snatch", color: LIFT_COLORS[3] },
                  ]}
                />
              </>
            ) : (
              <NoData hint="Tus levantamientos aparecerán aquí cuando tu coach registre una evaluación." />
            )}
          </ChartCard>

          <ChartCard
            title="Perfil de Rendimiento CrossFit"
            icon={<Dumbbell size={18} className="text-red-500" />}
          >
            {series.crossfit.radar.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={series.crossfit.radar}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                  <PolarRadiusAxis stroke="var(--border)" fontSize={10} domain={[0, 100]} />
                  <Radar dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <NoData hint="Tu coach construye este perfil durante las evaluaciones." />
            )}
          </ChartCard>

          <ChartCard title={t.dashboard.progress}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={series.crossfit.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calories" fill="#ef4444" radius={[6, 6, 0, 0]} name="Calorías" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Benchmark WODs">
            {series.crossfit.benchmarks.length > 0 ? (
              <div className="space-y-3">
                {series.crossfit.benchmarks.map((wod) => (
                  <div key={wod.name} className="flex items-center gap-4 p-3 rounded-xl bg-muted">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <Dumbbell size={16} className="text-red-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{wod.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {wod.prev ? `Anterior: ${wod.prev}` : "Primer registro"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-primary">{wod.best}</div>
                      {wod.prev && <div className="text-xs text-green-500">PR</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <NoData hint="Registra un benchmark con tu coach para verlo aquí." />
            )}
          </ChartCard>
        </div>
      )}

      {/* Hyrox Analytics */}
      {activeTab === "Hyrox" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Tiempos por Estación (min)"
            icon={<Timer size={18} className="text-yellow-500" />}
          >
            {series.hyrox.stations.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={series.hyrox.stations} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis type="category" dataKey="station" stroke="var(--muted-foreground)" fontSize={10} width={70} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="time" fill="#eab308" radius={[0, 6, 6, 0]} name="Actual" />
                    <Bar dataKey="target" fill="#22c55e" radius={[0, 6, 6, 0]} name="Objetivo" opacity={0.4} />
                  </BarChart>
                </ResponsiveContainer>
                <Legend
                  items={[
                    { label: "Actual", color: "#eab308", bar: true },
                    { label: "Objetivo", color: "#22c55e", bar: true, faded: true },
                  ]}
                />
              </>
            ) : (
              <NoData hint="Cada estación aparece cuando tu coach cronometra una simulación." />
            )}
          </ChartCard>

          <ChartCard
            title="Perfil de Rendimiento Hyrox"
            icon={<Timer size={18} className="text-yellow-500" />}
          >
            {series.hyrox.radar.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={series.hyrox.radar}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                  <PolarRadiusAxis stroke="var(--border)" fontSize={10} domain={[0, 100]} />
                  <Radar dataKey="value" stroke="#eab308" fill="#eab308" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <NoData hint="Tu coach construye este perfil durante las evaluaciones." />
            )}
          </ChartCard>

          <ChartCard title="Progresión de Simulaciones (min)" wide>
            {series.hyrox.races.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={series.hyrox.races}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="running" stackId="a" fill="#3b82f6" name="Running" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="stations" stackId="a" fill="#eab308" name="Estaciones" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" />Running</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded" />Estaciones</div>
                  {bestRace && (
                    <div className="sm:ml-auto font-bold text-primary">
                      Mejor: {bestRace.total} min
                      {firstRace && bestRace.total < firstRace.total
                        ? ` (${(bestRace.total - firstRace.total).toFixed(1)} min vs primera)`
                        : ""}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <NoData hint="Tus simulaciones de carrera aparecerán aquí tras la primera." />
            )}
          </ChartCard>
        </div>
      )}

      {/* Calistenia Analytics */}
      {activeTab === "Calistenia" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Progresión de Repeticiones"
            icon={<TrendingUp size={18} className="text-green-500" />}
          >
            {series.calistenia.reps.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={series.calistenia.reps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {CALISTENIA_REPS.map((rep, i) => (
                      <Line
                        key={rep}
                        type="monotone"
                        dataKey={rep}
                        stroke={REP_COLORS[i]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name={rep}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <Legend
                  items={[
                    { label: "Pull-ups", color: REP_COLORS[0] },
                    { label: "Dips", color: REP_COLORS[1] },
                    { label: "HSPU", color: REP_COLORS[2] },
                    { label: "Muscle-up", color: REP_COLORS[3] },
                  ]}
                />
              </>
            ) : (
              <NoData hint="Tus repeticiones máximas aparecerán aquí tras tu primera evaluación." />
            )}
          </ChartCard>

          <ChartCard
            title="Perfil de Rendimiento Calistenia"
            icon={<Target size={18} className="text-green-500" />}
          >
            {series.calistenia.radar.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={series.calistenia.radar}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                  <PolarRadiusAxis stroke="var(--border)" fontSize={10} domain={[0, 100]} />
                  <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <NoData hint="Tu coach construye este perfil durante las evaluaciones." />
            )}
          </ChartCard>

          <ChartCard title="Progresiones de Habilidades" wide>
            {series.calistenia.skills.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {series.calistenia.skills.map((skill) => (
                  <div key={skill.name} className="p-4 rounded-xl bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{skill.name}</span>
                      <span className="text-xs text-muted-foreground">{skill.status}</span>
                    </div>
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: skill.maxLevel }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 h-3 rounded-full ${
                            i < skill.level ? "bg-green-500" : "bg-border"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Nivel {skill.level}/{skill.maxLevel}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <NoData hint="Cada habilidad se desbloquea cuando tu coach evalúa tu nivel." />
            )}
          </ChartCard>
        </div>
      )}

      {/* Body Metrics (shared across programs) */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Scale size={18} className="text-primary" />
          {t.dashboard.bodyMetrics}
        </h3>
        {series.body.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={series.body}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="muscle" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name="Músculo (%)" connectNulls />
                <Area type="monotone" dataKey="fat" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2} name="Grasa (%)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
            <Legend
              items={[
                { label: "Músculo (%)", color: "#22c55e" },
                { label: "Grasa (%)", color: "#f97316" },
              ]}
            />
          </>
        ) : (
          <NoData hint="Tus mediciones de composición corporal aparecerán aquí tras la primera toma." />
        )}
      </div>
    </div>
  );
}
