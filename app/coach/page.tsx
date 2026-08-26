"use client";

import { useState } from "react";
import {
  Camera,
  Save,
  Star,
  User,
  Clock,
  ChevronRight,
  MessageSquare,
  Activity,
  CheckCircle,
  Search,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";

const students = [
  { id: 1, name: "Carlos Hernández", plan: "Pro", discipline: "CrossFit", lastSession: "Hoy", avatar: "CH" },
  { id: 2, name: "María López", plan: "Elite", discipline: "Hyrox", lastSession: "Hoy", avatar: "ML" },
  { id: 3, name: "Roberto Sánchez", plan: "Básico", discipline: "CrossFit", lastSession: "Ayer", avatar: "RS" },
  { id: 4, name: "Ana García", plan: "Pro", discipline: "Hyrox", lastSession: "Hoy", avatar: "AG" },
  { id: 5, name: "Diego Ramírez", plan: "Elite", discipline: "Calistenia", lastSession: "Hoy", avatar: "DR" },
  { id: 6, name: "Laura Martínez", plan: "Pro", discipline: "CrossFit", lastSession: "Ayer", avatar: "LM" },
];

const todaysSessions = [
  { time: "7:00 AM", class: "CrossFit WOD", students: 12, status: "completed" },
  { time: "8:00 AM", class: "Hyrox Engine", students: 8, status: "completed" },
  { time: "9:00 AM", class: "CrossFit Strength", students: 15, status: "active" },
  { time: "10:00 AM", class: "Calistenia Skills", students: 6, status: "upcoming" },
  { time: "5:00 PM", class: "Hyrox Complete", students: 10, status: "upcoming" },
];

const evaluationHistory = [
  { date: "2024-08-25", student: "Carlos H.", type: "CrossFit", rating: 9, notes: "Excelente técnica en C&J" },
  { date: "2024-08-25", student: "María L.", type: "Hyrox", rating: 8, notes: "Mejorar transiciones" },
  { date: "2024-08-24", student: "Diego R.", type: "Calistenia", rating: 7, notes: "Progreso en muscle-up" },
];

export default function CoachPage() {
  const { t } = useI18n();
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rating, setRating] = useState({ performance: 8, technique: 7, effort: 9 });
  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black">{t.coach.title}</h1>
              <p className="text-muted-foreground">
                Coach <span className="text-primary font-bold">Ana Rodríguez</span> — Hyrox & CrossFit
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <Clock size={16} className="text-primary" />
              <span className="text-sm font-medium">9:00 AM — CrossFit Strength</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Student List + Today's Sessions */}
            <div className="space-y-6">
              {/* Student Selector */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <User size={16} className="text-primary" />
                  {t.coach.selectStudent}
                </h3>
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted border border-input focus:border-primary outline-none text-sm"
                    placeholder="Buscar atleta..."
                  />
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                        selectedStudent === student.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {student.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.discipline} • {student.plan}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Today's Sessions */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  {t.coach.todaysSessions}
                </h3>
                <div className="space-y-2">
                  {todaysSessions.map((session, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        session.status === "active"
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          session.status === "completed"
                            ? "bg-green-500"
                            : session.status === "active"
                            ? "bg-primary animate-pulse"
                            : "bg-muted-foreground"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{session.class}</div>
                        <div className="text-xs text-muted-foreground">
                          {session.time} • {session.students} atletas
                        </div>
                      </div>
                      {session.status === "completed" && (
                        <CheckCircle size={14} className="text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center Panel: Evaluation Form */}
            <div className="lg:col-span-2 space-y-6">
              {selectedStudent ? (
                <>
                  {/* Evaluation Form */}
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Activity size={18} className="text-primary" />
                        {t.coach.evaluationForm}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                          {students.find((s) => s.id === selectedStudent)?.avatar}
                        </div>
                        <div>
                          <div className="text-sm font-bold">
                            {students.find((s) => s.id === selectedStudent)?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {students.find((s) => s.id === selectedStudent)?.discipline}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CrossFit Evaluation */}
                    <div className="space-y-6">
                      {/* Ratings */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { key: "performance", label: t.coach.performance },
                          { key: "technique", label: t.coach.technique },
                          { key: "effort", label: t.coach.effort },
                        ].map((metric) => (
                          <div key={metric.key} className="bg-muted rounded-xl p-4">
                            <label className="block text-sm font-medium mb-3">{metric.label}</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() =>
                                    setRating((prev) => ({ ...prev, [metric.key]: n }))
                                  }
                                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                                    n <= rating[metric.key as keyof typeof rating]
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-background border border-border"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                            <div className="text-center mt-2 text-2xl font-black text-primary">
                              {rating[metric.key as keyof typeof rating]}/10
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Specific Metrics - CrossFit */}
                      <div className="bg-muted rounded-xl p-4">
                        <label className="block text-sm font-bold mb-3">Métricas Específicas</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Back Squat (kg)</label>
                            <input
                              type="number"
                              placeholder="120"
                              className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Deadlift (kg)</label>
                            <input
                              type="number"
                              placeholder="140"
                              className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">WOD Time</label>
                            <input
                              type="text"
                              placeholder="12:30"
                              className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Rondas</label>
                            <input
                              type="number"
                              placeholder="5"
                              className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-input text-sm focus:border-primary outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Photo */}
                      <div className="bg-muted rounded-xl p-4">
                        <label className="block text-sm font-bold mb-3">{t.coach.takePhoto}</label>
                        <button
                          type="button"
                          className="w-full h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <Camera size={32} className="text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Toca para tomar foto o subir imagen
                          </span>
                        </button>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                          <MessageSquare size={14} className="text-primary" />
                          {t.coach.notes}
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-muted border border-input focus:border-primary focus:ring-2 focus:ring-ring/20 outline-none resize-none"
                          rows={4}
                          placeholder="Observaciones sobre técnica, progreso, recomendaciones..."
                        />
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={handleSave}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary-hover transition-colors text-lg"
                      >
                        <Save size={20} />
                        {t.coach.saveEvaluation}
                      </button>

                      {showSuccess && (
                        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600">
                          <CheckCircle size={18} />
                          <span className="font-medium">Evaluación guardada exitosamente</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evaluation History */}
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Star size={18} className="text-primary" />
                      {t.coach.history}
                    </h3>
                    <div className="space-y-3">
                      {evaluationHistory.map((ev, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{ev.rating}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{ev.student}</div>
                            <div className="text-xs text-muted-foreground">
                              {ev.type} • {ev.date}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {ev.notes}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <User size={40} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t.coach.selectStudent}</h3>
                  <p className="text-muted-foreground">
                    Selecciona un atleta de la lista para comenzar la evaluación
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
