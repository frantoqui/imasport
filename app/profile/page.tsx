"use client";

import { useState } from "react";
import { Camera, Save, User, Mail, Phone, Target, Ruler, Scale, Calendar, Clock, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";

export default function ProfilePage() {
  const { t } = useI18n();
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["Mejorar resistencia", "Competir en Hyrox"]);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-black mb-8">{t.profile.title}</h1>

          {/* Avatar Section */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                  <User size={40} className="text-primary" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary-hover transition-colors">
                  <Camera size={14} />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold">Carlos Hernández</h2>
                <p className="text-muted-foreground text-sm">Miembro desde Enero 2024</p>
                <p className="text-primary text-sm font-medium mt-1">Plan Pro — CrossFit & Hyrox</p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">{t.profile.personalInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t.auth.name}</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    defaultValue="Carlos Hernández"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.auth.email}</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    defaultValue="carlos@email.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.auth.phone}</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    defaultValue="+52 443 555 1234"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.profile.age}</label>
                <input
                  type="number"
                  defaultValue={28}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Body Metrics */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">{t.dashboard.bodyMetrics}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t.profile.weight}</label>
                <div className="relative">
                  <Scale size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    defaultValue={76}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.profile.height}</label>
                <div className="relative">
                  <Ruler size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    defaultValue={175}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">% Grasa Corporal</label>
                <input
                  type="number"
                  defaultValue={15.8}
                  step={0.1}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target size={18} className="text-primary" />
              {t.profile.goals}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {t.profile.goalOptions.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                    selectedGoals.includes(goal)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">{t.profile.preferences}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <span className="text-sm font-medium">Notificaciones de clase</span>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <span className="text-sm font-medium">Recordatorios de entrenamiento</span>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <span className="text-sm font-medium">Resumen semanal por email</span>
                <div className="w-12 h-6 bg-muted-foreground/30 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Session with Coach */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              {t.schedule.title}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t.schedule.selectCoach}</label>
                <select className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary outline-none transition-all">
                  <option>Carlos Méndez — CrossFit</option>
                  <option>Ana Rodríguez — Hyrox</option>
                  <option>Miguel Torres — Calistenia</option>
                  <option>Laura Vega — CrossFit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.schedule.sessionType}</label>
                <select className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary outline-none transition-all">
                  <option>{t.schedule.types.evaluation}</option>
                  <option>{t.schedule.types.personal}</option>
                  <option>{t.schedule.types.technique}</option>
                  <option>{t.schedule.types.planning}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.schedule.selectDate}</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t.schedule.selectTime}</label>
                <select className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary outline-none transition-all">
                  <option>7:00 AM</option>
                  <option>8:00 AM</option>
                  <option>9:00 AM</option>
                  <option>10:00 AM</option>
                  <option>5:00 PM</option>
                  <option>6:00 PM</option>
                  <option>7:00 PM</option>
                  <option>8:00 PM</option>
                </select>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors">
              <Calendar size={16} />
              {t.schedule.confirm}
            </button>

            {/* Upcoming Appointments */}
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Clock size={14} className="text-muted-foreground" />
                {t.schedule.upcoming}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <Calendar size={14} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Corrección de Técnica — CrossFit</div>
                    <div className="text-xs text-muted-foreground">Coach Carlos Méndez • 28 Ago, 9:00 AM</div>
                  </div>
                  <CheckCircle size={16} className="text-green-500" />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Calendar size={14} className="text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Evaluación Mensual — Hyrox</div>
                    <div className="text-xs text-muted-foreground">Coach Ana Rodríguez • 2 Sep, 10:00 AM</div>
                  </div>
                  <Clock size={16} className="text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors">
            <Save size={18} />
            {t.profile.save}
          </button>
        </div>
      </main>
    </>
  );
}
