"use client";

import { useState } from "react";
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

const crossfitData = {
  weekly: [
    { day: "Lun", calories: 680, duration: 60 },
    { day: "Mar", calories: 0, duration: 0 },
    { day: "Mié", calories: 720, duration: 65 },
    { day: "Jue", calories: 0, duration: 0 },
    { day: "Vie", calories: 750, duration: 60 },
    { day: "Sáb", calories: 550, duration: 45 },
    { day: "Dom", calories: 0, duration: 0 },
  ],
  lifts: [
    { month: "Mar", squat: 100, deadlift: 120, clean: 70, snatch: 55 },
    { month: "Abr", squat: 105, deadlift: 125, clean: 72, snatch: 57 },
    { month: "May", squat: 110, deadlift: 130, clean: 75, snatch: 60 },
    { month: "Jun", squat: 112, deadlift: 132, clean: 78, snatch: 62 },
    { month: "Jul", squat: 118, deadlift: 138, clean: 82, snatch: 65 },
    { month: "Ago", squat: 120, deadlift: 140, clean: 85, snatch: 67 },
  ],
  radar: [
    { metric: "Fuerza", value: 85, fullMark: 100 },
    { metric: "Gimnasia", value: 65, fullMark: 100 },
    { metric: "Cardio", value: 72, fullMark: 100 },
    { metric: "Halterofilia", value: 78, fullMark: 100 },
    { metric: "Movilidad", value: 60, fullMark: 100 },
    { metric: "Potencia", value: 80, fullMark: 100 },
  ],
  benchmarks: [
    { name: "Fran", best: "4:32", prev: "5:15" },
    { name: "Murph", best: "42:15", prev: "48:30" },
    { name: "Grace", best: "3:45", prev: "4:20" },
    { name: "Isabel", best: "5:10", prev: "6:00" },
  ],
};

const hyroxData = {
  weekly: [
    { day: "Lun", calories: 850, duration: 75 },
    { day: "Mar", calories: 600, duration: 50 },
    { day: "Mié", calories: 0, duration: 0 },
    { day: "Jue", calories: 920, duration: 80 },
    { day: "Vie", calories: 0, duration: 0 },
    { day: "Sáb", calories: 1100, duration: 95 },
    { day: "Dom", calories: 0, duration: 0 },
  ],
  stations: [
    { station: "SkiErg", time: 4.2, target: 3.8 },
    { station: "Sled Push", time: 3.5, target: 3.0 },
    { station: "Sled Pull", time: 3.8, target: 3.2 },
    { station: "Burpees", time: 4.0, target: 3.5 },
    { station: "Row", time: 4.5, target: 4.0 },
    { station: "Farmers", time: 2.8, target: 2.5 },
    { station: "Lunges", time: 5.2, target: 4.5 },
    { station: "Wall Balls", time: 4.8, target: 4.0 },
  ],
  raceProgress: [
    { race: "Sim #1", total: 82, running: 42, stations: 40 },
    { race: "Sim #2", total: 78, running: 40, stations: 38 },
    { race: "Sim #3", total: 75, running: 39, stations: 36 },
    { race: "Sim #4", total: 72, running: 38, stations: 34 },
    { race: "Sim #5", total: 70, running: 37, stations: 33 },
  ],
  radar: [
    { metric: "Running", value: 75, fullMark: 100 },
    { metric: "SkiErg", value: 68, fullMark: 100 },
    { metric: "Sled", value: 72, fullMark: 100 },
    { metric: "Burpees", value: 80, fullMark: 100 },
    { metric: "Row", value: 70, fullMark: 100 },
    { metric: "Wall Balls", value: 65, fullMark: 100 },
  ],
};

const calisteniaData = {
  weekly: [
    { day: "Lun", calories: 0, duration: 0 },
    { day: "Mar", calories: 420, duration: 55 },
    { day: "Mié", calories: 0, duration: 0 },
    { day: "Jue", calories: 450, duration: 60 },
    { day: "Vie", calories: 0, duration: 0 },
    { day: "Sáb", calories: 380, duration: 50 },
    { day: "Dom", calories: 0, duration: 0 },
  ],
  skills: [
    { month: "Mar", pullups: 8, dips: 12, hspu: 2, muscleup: 0 },
    { month: "Abr", pullups: 10, dips: 15, hspu: 3, muscleup: 0 },
    { month: "May", pullups: 12, dips: 18, hspu: 5, muscleup: 0 },
    { month: "Jun", pullups: 14, dips: 20, hspu: 6, muscleup: 1 },
    { month: "Jul", pullups: 15, dips: 22, hspu: 8, muscleup: 2 },
    { month: "Ago", pullups: 17, dips: 25, hspu: 10, muscleup: 3 },
  ],
  radar: [
    { metric: "Push", value: 82, fullMark: 100 },
    { metric: "Pull", value: 75, fullMark: 100 },
    { metric: "Core", value: 70, fullMark: 100 },
    { metric: "Legs", value: 65, fullMark: 100 },
    { metric: "Skills", value: 55, fullMark: 100 },
    { metric: "Holds", value: 60, fullMark: 100 },
  ],
  progressions: [
    { name: "Muscle-Up", level: 3, maxLevel: 5, status: "En progreso" },
    { name: "Handstand Push-up", level: 4, maxLevel: 5, status: "Avanzado" },
    { name: "Front Lever", level: 2, maxLevel: 5, status: "Intermedio" },
    { name: "Planche", level: 1, maxLevel: 5, status: "Principiante" },
  ],
};

const bodyMetrics = [
  { week: "Sem 1", muscle: 35, fat: 18 },
  { week: "Sem 2", muscle: 35.3, fat: 17.5 },
  { week: "Sem 3", muscle: 35.8, fat: 17.1 },
  { week: "Sem 4", muscle: 36.2, fat: 16.5 },
  { week: "Sem 5", muscle: 36.5, fat: 16.2 },
  { week: "Sem 6", muscle: 37.0, fat: 15.8 },
];

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
};

const tabs = [
  { key: "crossfit", label: "CrossFit", icon: Dumbbell, color: "#ef4444" },
  { key: "hyrox", label: "Hyrox", icon: Timer, color: "#eab308" },
  { key: "calistenia", label: "Calistenia", icon: Target, color: "#22c55e" },
];

export default function DashboardCharts() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("crossfit");

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
      {activeTab === "crossfit" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-red-500" />
              Progresión de Levantamientos (kg)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={crossfitData.lifts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="squat" stroke="#ef4444" strokeWidth={2} dot={false} name="Squat" />
                <Line type="monotone" dataKey="deadlift" stroke="#3b82f6" strokeWidth={2} dot={false} name="Deadlift" />
                <Line type="monotone" dataKey="clean" stroke="#22c55e" strokeWidth={2} dot={false} name="Clean" />
                <Line type="monotone" dataKey="snatch" stroke="#a855f7" strokeWidth={2} dot={false} name="Snatch" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-red-500 rounded" />Squat</div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500 rounded" />Deadlift</div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500 rounded" />Clean</div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-purple-500 rounded" />Snatch</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Dumbbell size={18} className="text-red-500" />
              Perfil de Rendimiento CrossFit
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={crossfitData.radar}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                <PolarRadiusAxis stroke="var(--border)" fontSize={10} />
                <Radar dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">{t.dashboard.progress}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={crossfitData.weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="calories" fill="#ef4444" radius={[6, 6, 0, 0]} name="Calorías" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4">Benchmark WODs</h3>
            <div className="space-y-3">
              {crossfitData.benchmarks.map((wod) => (
                <div key={wod.name} className="flex items-center gap-4 p-3 rounded-xl bg-muted">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Dumbbell size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{wod.name}</div>
                    <div className="text-xs text-muted-foreground">Anterior: {wod.prev}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-primary">{wod.best}</div>
                    <div className="text-xs text-green-500">PR</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hyrox Analytics */}
      {activeTab === "hyrox" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Timer size={18} className="text-yellow-500" />
              Tiempos por Estación (min)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hyroxData.stations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="station" stroke="var(--muted-foreground)" fontSize={10} width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="time" fill="#eab308" radius={[0, 6, 6, 0]} name="Actual" />
                <Bar dataKey="target" fill="#22c55e" radius={[0, 6, 6, 0]} name="Objetivo" opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded" />Actual</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 opacity-40 rounded" />Objetivo</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Timer size={18} className="text-yellow-500" />
              Perfil de Rendimiento Hyrox
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={hyroxData.radar}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                <PolarRadiusAxis stroke="var(--border)" fontSize={10} />
                <Radar dataKey="value" stroke="#eab308" fill="#eab308" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-lg font-bold mb-4">Progresión de Simulaciones (min)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hyroxData.raceProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="race" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="running" stackId="a" fill="#3b82f6" name="Running" radius={[0, 0, 0, 0]} />
                <Bar dataKey="stations" stackId="a" fill="#eab308" name="Estaciones" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" />Running</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded" />Estaciones</div>
              <div className="ml-auto font-bold text-primary">Mejor: 70 min (-12 min vs primera)</div>
            </div>
          </div>
        </div>
      )}

      {/* Calistenia Analytics */}
      {activeTab === "calistenia" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" />
              Progresión de Repeticiones
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={calisteniaData.skills}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="pullups" stroke="#22c55e" strokeWidth={2} dot={false} name="Pull-ups" />
                <Line type="monotone" dataKey="dips" stroke="#3b82f6" strokeWidth={2} dot={false} name="Dips" />
                <Line type="monotone" dataKey="hspu" stroke="#a855f7" strokeWidth={2} dot={false} name="HSPU" />
                <Line type="monotone" dataKey="muscleup" stroke="#ef4444" strokeWidth={2} dot={false} name="Muscle-up" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500 rounded" />Pull-ups</div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500 rounded" />Dips</div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-purple-500 rounded" />HSPU</div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-red-500 rounded" />Muscle-up</div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target size={18} className="text-green-500" />
              Perfil de Rendimiento Calistenia
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={calisteniaData.radar}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" stroke="var(--muted-foreground)" fontSize={11} />
                <PolarRadiusAxis stroke="var(--border)" fontSize={10} />
                <Radar dataKey="value" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-lg font-bold mb-4">Progresiones de Habilidades</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calisteniaData.progressions.map((skill) => (
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
          </div>
        </div>
      )}

      {/* Body Metrics (shared across programs) */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Scale size={18} className="text-primary" />
          {t.dashboard.bodyMetrics}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={bodyMetrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="muscle" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} name="Músculo (%)" />
            <Area type="monotone" dataKey="fat" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2} name="Grasa (%)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-green-500 rounded" />Músculo (%)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-orange-500 rounded" />Grasa (%)</div>
        </div>
      </div>
    </div>
  );
}
