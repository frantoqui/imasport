"use client";

import Link from "next/link";
import {
  Activity,
  Flame,
  Trophy,
  Zap,
  Calendar,
  TrendingUp,
  User,
  ChevronRight,
  Dumbbell,
  Timer,
  Target,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Navbar from "@/components/Navbar";
import DashboardCharts from "@/components/DashboardCharts";

const recentWorkouts = [
  {
    date: "2024-08-25",
    type: "CrossFit",
    name: "Murph",
    duration: "42:15",
    calories: 650,
    icon: Dumbbell,
  },
  {
    date: "2024-08-23",
    type: "Hyrox",
    name: "Simulación Race",
    duration: "1:12:30",
    calories: 980,
    icon: Timer,
  },
  {
    date: "2024-08-22",
    type: "Calistenia",
    name: "Muscle-up Progresión",
    duration: "55:00",
    calories: 420,
    icon: Target,
  },
  {
    date: "2024-08-20",
    type: "CrossFit",
    name: "Fran",
    duration: "4:32",
    calories: 280,
    icon: Dumbbell,
  },
];

const achievements = [
  { name: "Primera Semana", description: "7 días consecutivos", unlocked: true },
  { name: "PR de Sentadilla", description: "Nuevo récord: 120kg", unlocked: true },
  { name: "Hyrox Ready", description: "Completaste simulación", unlocked: true },
  { name: "Muscle-up", description: "Primer muscle-up estricto", unlocked: false },
  { name: "Racha 30", description: "30 días seguidos", unlocked: false },
];

export default function DashboardPage() {
  const { t } = useI18n();

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black">{t.dashboard.title}</h1>
              <p className="text-muted-foreground">
                {t.dashboard.welcome}, <span className="text-primary font-bold">Carlos</span>! ⚡
              </p>
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-primary transition-colors"
            >
              <User size={18} />
              <span className="hidden sm:inline text-sm font-medium">{t.nav.profile}</span>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Activity size={20} className="text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t.dashboard.stats.sessions}</span>
              </div>
              <div className="text-3xl font-black">18</div>
              <div className="text-xs text-green-500 mt-1">+3 vs mes anterior</div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-orange-500/10">
                  <Flame size={20} className="text-orange-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t.dashboard.stats.streak}</span>
              </div>
              <div className="text-3xl font-black">12 días</div>
              <div className="text-xs text-green-500 mt-1">¡Récord personal!</div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Trophy size={20} className="text-purple-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t.dashboard.stats.pr}</span>
              </div>
              <div className="text-3xl font-black">4</div>
              <div className="text-xs text-green-500 mt-1">Squat, DL, C&J, Row</div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-red-500/10">
                  <Zap size={20} className="text-red-500" />
                </div>
                <span className="text-sm text-muted-foreground">{t.dashboard.stats.calories}</span>
              </div>
              <div className="text-3xl font-black">12,450</div>
              <div className="text-xs text-green-500 mt-1">+18% vs mes anterior</div>
            </div>
          </div>

          {/* Charts */}
          <DashboardCharts />

          {/* Recent Workouts & Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Recent Workouts */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                {t.dashboard.recentWorkouts}
              </h3>
              <div className="space-y-3">
                {recentWorkouts.map((workout, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-xl bg-primary/10">
                      <workout.icon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{workout.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {workout.type} • {workout.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{workout.duration}</div>
                      <div className="text-xs text-muted-foreground">{workout.calories} kcal</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-primary" />
                {t.dashboard.achievements}
              </h3>
              <div className="space-y-3">
                {achievements.map((achievement, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-3 rounded-xl ${
                      achievement.unlocked ? "bg-primary/5" : "opacity-50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        achievement.unlocked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted border-2 border-dashed border-border"
                      }`}
                    >
                      {achievement.unlocked ? (
                        <Trophy size={16} />
                      ) : (
                        <span className="text-xs">?</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{achievement.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {achievement.description}
                      </div>
                    </div>
                    {achievement.unlocked && (
                      <span className="text-xs text-primary font-medium">✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Next Class */}
          <div className="mt-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary text-primary-foreground">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-bold">{t.dashboard.nextClass}</h3>
                  <p className="text-sm text-muted-foreground">
                    Hyrox Engine — Mañana 7:00 AM — Coach Ana Rodríguez
                  </p>
                </div>
              </div>
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-hover transition-colors">
                Reservar <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
