"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Loader2, Save, Target } from "lucide-react";
import { calculateBMI, calculateSmartGoal, linearRegression } from "@/lib/calculations";

const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (UTC-3)" },
  { value: "America/Santiago", label: "Chile (UTC-4 / UTC-3 verano)" },
  { value: "America/Bogota", label: "Colombia (UTC-5)" },
  { value: "America/Lima", label: "Perú (UTC-5)" },
  { value: "America/Mexico_City", label: "México - Ciudad de México (UTC-6)" },
  { value: "America/Monterrey", label: "México - Monterrey (UTC-6)" },
  { value: "America/Caracas", label: "Venezuela (UTC-4)" },
  { value: "America/La_Paz", label: "Bolivia (UTC-4)" },
  { value: "America/Asuncion", label: "Paraguay (UTC-4)" },
  { value: "America/Montevideo", label: "Uruguay (UTC-3)" },
  { value: "America/Guayaquil", label: "Ecuador (UTC-5)" },
  { value: "America/Sao_Paulo", label: "Brasil - São Paulo (UTC-3)" },
  { value: "America/New_York", label: "EE.UU. - New York (UTC-5)" },
  { value: "America/Chicago", label: "EE.UU. - Chicago (UTC-6)" },
  { value: "America/Los_Angeles", label: "EE.UU. - Los Angeles (UTC-8)" },
  { value: "Europe/Madrid", label: "España (UTC+1)" },
  { value: "UTC", label: "UTC (0)" },
];

interface UserProfile {
  name: string;
  email: string;
  heightCm: number;
  weightGoalKg: number;
  activityLevel: string;
  trainDays: string;
  trainTime: string;
  sex: string;
  timezone: string;
}

interface WeightLog {
  weightKg: number;
  loggedAt: string;
}

function getBMIColor(bmi: number) {
  if (bmi < 18.5) return "text-[#185FA5] bg-[#E6F1FB]";
  if (bmi < 25) return "text-[#3B6D11] bg-[#EAF3DE]";
  if (bmi < 30) return "text-[#BA7517] bg-[#FAEEDA]";
  return "text-[#A32D2D] bg-[#FCEBEB]";
}

function getBMILabel(bmi: number) {
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidad";
}

function calcDaysByTrend(logs: WeightLog[], goalKg: number): number | null {
  if (logs.length < 3) return null;
  const sorted = [...logs].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  const last14 = sorted.slice(-14);
  const startTime = new Date(last14[0].loggedAt).getTime();
  const points = last14.map(l => ({
    x: (new Date(l.loggedAt).getTime() - startTime) / (1000 * 60 * 60 * 24),
    y: l.weightKg,
  }));
  const { slope } = linearRegression(points);
  if (slope >= 0) return null; // not losing weight
  const currentWeight = sorted[sorted.length - 1].weightKg;
  if (currentWeight <= goalKg) return 0;
  const daysNeeded = (goalKg - currentWeight) / slope;
  return Math.round(Math.max(daysNeeded, 0));
}

function formatDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ConfiguracionPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/weight").then(r => r.json()),
    ]).then(([profileData, weightData]) => {
      setProfile(profileData.user);
      const logs: WeightLog[] = weightData.weightLogs || [];
      setWeightLogs(logs);
      if (logs.length > 0) {
        const sorted = [...logs].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
        setCurrentWeight(sorted[0].weightKg);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#1A1A18] border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const h = profile.heightCm;
  const w = currentWeight || profile.weightGoalKg + 10;
  const currentBMI = calculateBMI(w, h);
  const hM = h / 100;

  // Suggested goals at different BMI targets
  const goals = [
    { bmi: 24, label: "Inicio saludable", desc: "IMC 24 — límite inferior del rango normal", weight: Math.round(24 * hM * hM * 10) / 10 },
    { bmi: 22, label: "Peso ideal", desc: "IMC 22 — centro del rango saludable", weight: Math.round(22 * hM * hM * 10) / 10 },
    { bmi: 21, label: "Óptimo", desc: "IMC 21 — zona atlética saludable", weight: Math.round(21 * hM * hM * 10) / 10 },
  ].filter(g => g.weight < w); // only show goals that require losing weight

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#1A1A18]">Configuración</h1>
        <p className="text-sm text-[#6B6B65] mt-0.5">Actualizá tu perfil y preferencias</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        {/* Perfil */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-sm font-medium text-[#1A1A18] mb-4">Perfil</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Nombre</label>
              <input
                value={profile.name}
                onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)}
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Email</label>
              <input value={profile.email} disabled className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-[#F0EFE9] px-3 text-sm text-[#A0A09A]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Zona horaria</label>
              <select
                value={profile.timezone || "America/Argentina/Buenos_Aires"}
                onChange={e => setProfile(p => p ? { ...p, timezone: e.target.value } : p)}
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-[#A0A09A] mt-1">Las notificaciones de Telegram se enviarán en este horario</p>
            </div>
          </div>
        </div>

        {/* Datos físicos */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-sm font-medium text-[#1A1A18] mb-4">Datos físicos</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Altura (cm)</label>
              <input
                type="number"
                value={profile.heightCm}
                onChange={e => setProfile(p => p ? { ...p, heightCm: parseFloat(e.target.value) } : p)}
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            {/* Current BMI */}
            {currentWeight && (
              <div className="flex items-center gap-2 py-2">
                <span className="text-xs text-[#6B6B65]">Tu IMC actual:</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getBMIColor(currentBMI)}`}>
                  {currentBMI.toFixed(1)} — {getBMILabel(currentBMI)}
                </span>
                <span className="text-xs text-[#A0A09A]">({currentWeight} kg)</span>
              </div>
            )}
          </div>
        </div>

        {/* Peso objetivo */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target size={15} className="text-[#1A1A18]" />
            <p className="text-sm font-medium text-[#1A1A18]">Peso objetivo</p>
          </div>

          {goals.length > 0 ? (
            <div className="space-y-2 mb-3">
              {goals.map(goal => {
                const isSelected = Math.abs(profile.weightGoalKg - goal.weight) < 0.5;
                const days = calcDaysByTrend(weightLogs, goal.weight);
                const daysByDefault = Math.round(((w - goal.weight) * 7700) / (500 * 7));

                return (
                  <button
                    key={goal.bmi}
                    type="button"
                    onClick={() => setProfile(p => p ? { ...p, weightGoalKg: goal.weight } : p)}
                    className={`w-full text-left px-3 py-3 rounded-[10px] border transition-all ${
                      isSelected
                        ? "border-[#1A1A18] bg-[#1A1A18] text-white"
                        : "border-[rgba(0,0,0,0.10)] bg-white hover:bg-[#F0EFE9]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-[#1A1A18]"}`}>
                          {goal.label} — {goal.weight} kg
                        </p>
                        <p className={`text-xs mt-0.5 ${isSelected ? "text-white/70" : "text-[#6B6B65]"}`}>
                          {goal.desc}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        {days !== null && days > 0 ? (
                          <>
                            <p className={`text-xs font-mono font-medium ${isSelected ? "text-white" : "text-[#1A1A18]"}`}>
                              ~{days} días
                            </p>
                            <p className={`text-[10px] ${isSelected ? "text-white/60" : "text-[#A0A09A]"}`}>
                              por tu ritmo actual
                            </p>
                          </>
                        ) : (
                          <>
                            <p className={`text-xs font-mono font-medium ${isSelected ? "text-white" : "text-[#1A1A18]"}`}>
                              ~{daysByDefault} días
                            </p>
                            <p className={`text-[10px] ${isSelected ? "text-white/60" : "text-[#A0A09A]"}`}>
                              a 0.5 kg/semana
                            </p>
                          </>
                        )}
                        {days !== null && days > 0 && (
                          <p className={`text-[10px] ${isSelected ? "text-white/50" : "text-[#A0A09A]"}`}>
                            {formatDate(days)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#3B6D11] bg-[#EAF3DE] px-3 py-2 rounded-[8px] mb-3">
              Ya estás en tu rango de peso saludable. ¡Buen trabajo!
            </p>
          )}

          {/* Manual override */}
          <div>
            <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
              O ingresá un peso personalizado (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={profile.weightGoalKg}
              onChange={e => setProfile(p => p ? { ...p, weightGoalKg: parseFloat(e.target.value) } : p)}
              className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
            />
          </div>

          {/* Projection for selected goal */}
          {(() => {
            const days = calcDaysByTrend(weightLogs, profile.weightGoalKg);
            const defaultDays = Math.round(((w - profile.weightGoalKg) * 7700) / (500 * 7));
            if (profile.weightGoalKg >= w) return null;
            return (
              <div className="mt-3 bg-[#F0EFE9] rounded-[8px] px-3 py-2.5">
                <p className="text-xs font-medium text-[#1A1A18]">
                  Meta: {profile.weightGoalKg} kg
                </p>
                {days !== null && days > 0 ? (
                  <p className="text-xs text-[#6B6B65] mt-0.5">
                    Según tu ritmo actual: <span className="font-medium text-[#1A1A18]">~{days} días</span> — {formatDate(days)}
                  </p>
                ) : (
                  <p className="text-xs text-[#6B6B65] mt-0.5">
                    Estimado a 0.5 kg/semana: <span className="font-medium text-[#1A1A18]">~{defaultDays} días</span> — {formatDate(defaultDays)}
                  </p>
                )}
                {days === null && weightLogs.length < 3 && (
                  <p className="text-[10px] text-[#A0A09A] mt-1">
                    Registrá más pesajes para ver estimación por tu tendencia real
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar cambios
          </button>
          {saved && <span className="text-xs text-[#3B6D11]">¡Guardado!</span>}
        </div>
      </form>
    </MainLayout>
  );
}
