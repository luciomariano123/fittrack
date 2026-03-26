"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { getDayName } from "@/lib/utils";

interface Exercise {
  id: number;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  weightKg: number | null;
  dayOfWeek: string;
  order: number;
}

interface Session {
  id: number;
  date: string;
  routineName: string;
  completed: boolean;
  completedAt: string | null;
  mood?: string | null;
  notes?: string | null;
  duration?: number | null;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const MOODS = [
  { value: "great", emoji: "💪", label: "Excelente" },
  { value: "good", emoji: "😊", label: "Bien" },
  { value: "tired", emoji: "😐", label: "Cansado" },
  { value: "bad", emoji: "😞", label: "Mal" },
];

export default function RutinasPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string>(getDayName(new Date()));
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: "",
    muscleGroup: "",
    sets: "3",
    reps: "12",
    weightKg: "",
    dayOfWeek: getDayName(new Date()),
  });

  // Session notes modal state
  const [moodModal, setMoodModal] = useState<{
    sessionId: number;
    visible: boolean;
  } | null>(null);
  const [moodForm, setMoodForm] = useState({
    mood: "",
    notes: "",
    duration: "60",
  });
  const [savingMood, setSavingMood] = useState(false);

  const today = getDayName(new Date());

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
    ]).then(([exData, sessData]) => {
      setExercises(exData.exercises || []);
      setSessions(sessData.sessions || []);
      setLoading(false);
    });
  }, []);

  async function handleCompleteSession(sessionId: number) {
    // Show mood modal instead of completing immediately
    setMoodForm({ mood: "", notes: "", duration: "60" });
    setMoodModal({ sessionId, visible: true });
  }

  async function handleSaveMood() {
    if (!moodModal) return;
    setSavingMood(true);
    try {
      const res = await fetch(`/api/sessions/${moodModal.sessionId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: moodForm.mood || undefined,
          notes: moodForm.notes || undefined,
          duration: moodForm.duration ? parseInt(moodForm.duration) : undefined,
        }),
      });
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === moodModal.sessionId
              ? {
                  ...s,
                  completed: true,
                  completedAt: new Date().toISOString(),
                  mood: moodForm.mood || null,
                  notes: moodForm.notes || null,
                  duration: moodForm.duration ? parseInt(moodForm.duration) : null,
                }
              : s
          )
        );
        setMoodModal(null);
      }
    } finally {
      setSavingMood(false);
    }
  }

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExercise,
          sets: parseInt(newExercise.sets),
          weightKg: newExercise.weightKg ? parseFloat(newExercise.weightKg) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExercises((prev) => [...prev, data.exercise]);
        setShowAddForm(false);
        setNewExercise({
          name: "",
          muscleGroup: "",
          sets: "3",
          reps: "12",
          weightKg: "",
          dayOfWeek: getDayName(new Date()),
        });
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDeleteExercise(id: number) {
    if (!confirm("¿Querés eliminar este ejercicio?")) return;
    const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
    if (res.ok) {
      setExercises((prev) => prev.filter((e) => e.id !== id));
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#1A1A18] border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const sessionMap = new Map<string, Session>();
  sessions.forEach((s) => {
    const key = new Date(s.date).toISOString().split("T")[0];
    sessionMap.set(key, s);
  });

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium text-[#1A1A18]">Rutinas</h1>
          <p className="text-sm text-[#6B6B65] mt-0.5">
            Tu plan de entrenamiento semanal
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors"
        >
          <Plus size={15} />
          Agregar
        </button>
      </div>

      {/* Add exercise form */}
      {showAddForm && (
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4 mb-4">
          <p className="text-sm font-medium text-[#1A1A18] mb-4">
            Nuevo ejercicio
          </p>
          <form onSubmit={handleAddExercise} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                  Nombre
                </label>
                <input
                  value={newExercise.name}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Sentadillas"
                  required
                  className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                  Grupo muscular
                </label>
                <input
                  value={newExercise.muscleGroup}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, muscleGroup: e.target.value }))
                  }
                  placeholder="Piernas"
                  required
                  className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                  Series
                </label>
                <input
                  type="number"
                  value={newExercise.sets}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, sets: e.target.value }))
                  }
                  min={1}
                  className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                  Reps
                </label>
                <input
                  value={newExercise.reps}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, reps: e.target.value }))
                  }
                  placeholder="12 reps"
                  className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newExercise.weightKg}
                  onChange={(e) =>
                    setNewExercise((p) => ({ ...p, weightKg: e.target.value }))
                  }
                  placeholder="Opcional"
                  className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Día
              </label>
              <select
                value={newExercise.dayOfWeek}
                onChange={(e) =>
                  setNewExercise((p) => ({ ...p, dayOfWeek: e.target.value }))
                }
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={addLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
              >
                {addLoading && <Loader2 size={14} className="animate-spin" />}
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-[8px] text-sm font-medium text-[#6B6B65] hover:bg-[#F0EFE9] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Days */}
      <div className="space-y-2">
        {DAYS.map((day) => {
          const dayExercises = exercises.filter((e) => e.dayOfWeek === day);
          const isExpanded = expandedDay === day;
          const isToday = day === today;
          const todayKey = new Date().toISOString().split("T")[0];
          const todaySession = isToday ? sessionMap.get(todayKey) : undefined;

          return (
            <div
              key={day}
              className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] overflow-hidden"
            >
              <button
                onClick={() => setExpandedDay(isExpanded ? "" : day)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F0EFE9]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      isToday ? "text-[#1A1A18]" : "text-[#6B6B65]"
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-[#1A1A18] text-white px-2 py-0.5 rounded-full">
                      Hoy
                    </span>
                  )}
                  {dayExercises.length === 0 && (
                    <span className="text-xs text-[#A0A09A]">Descanso</span>
                  )}
                  {dayExercises.length > 0 && (
                    <span className="text-xs text-[#A0A09A]">
                      {dayExercises.length} ejercicios
                    </span>
                  )}
                  {todaySession?.completed && (
                    <span className="text-xs bg-[#EAF3DE] text-[#3B6D11] px-2 py-0.5 rounded-full">
                      Completado
                    </span>
                  )}
                </div>
                {dayExercises.length > 0 && (
                  isExpanded ? (
                    <ChevronUp size={16} className="text-[#A0A09A]" />
                  ) : (
                    <ChevronDown size={16} className="text-[#A0A09A]" />
                  )
                )}
              </button>

              {isExpanded && dayExercises.length > 0 && (
                <div className="border-t border-[rgba(0,0,0,0.06)] px-4 py-3">
                  <div className="space-y-2 mb-4">
                    {dayExercises
                      .sort((a, b) => a.order - b.order)
                      .map((ex) => (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between py-1.5"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-[#F0EFE9] flex items-center justify-center mt-0.5 shrink-0">
                              <span className="text-[10px] font-medium text-[#6B6B65]">
                                {ex.muscleGroup.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#1A1A18]">
                                {ex.name}
                              </p>
                              <p className="text-xs text-[#A0A09A]">
                                {ex.sets} series × {ex.reps}
                                {ex.weightKg ? ` — ${ex.weightKg} kg` : ""}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteExercise(ex.id)}
                            className="p-1.5 rounded-[6px] hover:bg-[#FCEBEB] text-[#A0A09A] hover:text-[#A32D2D] transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Complete session button (only for today) */}
                  {isToday && (
                    <div className="pt-3 border-t border-[rgba(0,0,0,0.06)]">
                      {todaySession?.completed ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-[#3B6D11]">
                            <CheckCircle2 size={16} />
                            <span>Sesión completada</span>
                            {todaySession.mood && (
                              <span className="ml-1">
                                {MOODS.find((m) => m.value === todaySession.mood)?.emoji}
                              </span>
                            )}
                          </div>
                          {todaySession.notes && (
                            <p className="text-xs text-[#6B6B65] pl-6">
                              {todaySession.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            todaySession && handleCompleteSession(todaySession.id)
                          }
                          disabled={!todaySession || completingId === todaySession?.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#3B6D11] text-white hover:bg-[#3B6D11]/85 transition-colors disabled:opacity-50"
                        >
                          {completingId === todaySession?.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          Marcar como completado
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mood / Notes Modal */}
      {moodModal?.visible && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.08)] w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-[#1A1A18]">
                ¿Cómo te sentiste hoy?
              </h3>
              <button
                onClick={() => setMoodModal(null)}
                className="p-1.5 rounded-[6px] hover:bg-[#F0EFE9] text-[#A0A09A] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Mood selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMoodForm((p) => ({ ...p, mood: m.value }))}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-[10px] border transition-colors ${
                    moodForm.mood === m.value
                      ? "bg-[#1A1A18] border-[#1A1A18]"
                      : "bg-white border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span
                    className={`text-xs font-medium ${
                      moodForm.mood === m.value ? "text-white" : "text-[#6B6B65]"
                    }`}
                  >
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Notas opcionales
              </label>
              <textarea
                value={moodForm.notes}
                onChange={(e) => setMoodForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notas opcionales: subí peso en sentadillas, me dolió el hombro..."
                rows={3}
                className="w-full rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18] resize-none"
              />
            </div>

            {/* Duration */}
            <div className="mb-6">
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                ¿Cuánto duró tu sesión? (minutos)
              </label>
              <input
                type="number"
                value={moodForm.duration}
                onChange={(e) => setMoodForm((p) => ({ ...p, duration: e.target.value }))}
                min={5}
                max={300}
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMoodModal(null)}
                className="flex-1 px-4 py-2.5 rounded-[8px] text-sm font-medium text-[#6B6B65] border border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9] transition-colors"
              >
                Omitir
              </button>
              <button
                type="button"
                onClick={handleSaveMood}
                disabled={savingMood}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[8px] text-sm font-medium bg-[#3B6D11] text-white hover:bg-[#3B6D11]/85 transition-colors disabled:opacity-50"
              >
                {savingMood ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
