"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateBMI,
  calculateIdealWeight,
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateDailyProtein,
  calculateDaysToGoal,
  calculateGoalDate,
  calculateAge,
  calculateSmartGoal,
  getBMICategory,
} from "@/lib/calculations";
import { Activity, ChevronRight, ChevronLeft, Loader2, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentario", desc: "Sin ejercicio" },
  { value: "light", label: "Ligero", desc: "1-3 días/semana" },
  { value: "moderate", label: "Moderado", desc: "3-5 días/semana" },
  { value: "active", label: "Activo", desc: "6-7 días/semana" },
  { value: "very_active", label: "Muy activo", desc: "Doble turno" },
];

function getBMIColor(bmi: number): string {
  if (bmi < 18.5) return "text-[#185FA5]";
  if (bmi < 25) return "text-[#3B6D11]";
  if (bmi < 30) return "text-[#C97D10]";
  return "text-[#A32D2D]";
}

function getBMIBadgeColor(bmi: number): string {
  if (bmi < 18.5) return "bg-[#E6F1FB] text-[#185FA5]";
  if (bmi < 25) return "bg-[#EAF3DE] text-[#3B6D11]";
  if (bmi < 30) return "bg-[#FEF3E2] text-[#C97D10]";
  return "bg-[#FCEBEB] text-[#A32D2D]";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    birthDate: "",
    sex: "",
    heightCm: "",
    currentWeightKg: "",
    activityLevel: "moderate",
    trainDays: [] as string[],
    trainTime: "morning",
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDay(day: string) {
    setForm((prev) => ({
      ...prev,
      trainDays: prev.trainDays.includes(day)
        ? prev.trainDays.filter((d) => d !== day)
        : [...prev.trainDays, day],
    }));
  }

  // Derived calculations
  const currentWeight = parseFloat(form.currentWeightKg) || 0;
  const height = parseFloat(form.heightCm) || 0;
  const birthDate = form.birthDate ? new Date(form.birthDate) : null;
  const age = birthDate ? calculateAge(birthDate) : 0;

  const bmi = currentWeight && height ? calculateBMI(currentWeight, height) : 0;
  const bmiCategory = bmi ? getBMICategory(bmi) : "";
  const idealWeight = height && form.sex ? calculateIdealWeight(height, form.sex) : 0;
  const smartGoal = currentWeight && height && form.sex
    ? calculateSmartGoal(currentWeight, height, form.sex)
    : 0;
  const bmr = currentWeight && height && age && form.sex
    ? calculateBMR(currentWeight, height, age, form.sex)
    : 0;
  const tdee = bmr ? calculateTDEE(bmr, form.activityLevel) : 0;
  const targetCalories = tdee ? calculateTargetCalories(tdee) : 0;
  const proteinTarget = currentWeight ? calculateDailyProtein(currentWeight) : 0;
  const daysToGoal = currentWeight && smartGoal && currentWeight > smartGoal
    ? calculateDaysToGoal(currentWeight, smartGoal)
    : 0;
  const goalDate = daysToGoal ? calculateGoalDate(daysToGoal) : null;

  // Step validation
  function canProceed(): boolean {
    if (step === 1) return !!(form.name && form.birthDate && form.sex && form.heightCm);
    if (step === 2) return !!(form.currentWeightKg);
    if (step === 3) return form.trainDays.length > 0;
    return true;
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          birthDate: form.birthDate,
          sex: form.sex,
          heightCm: parseFloat(form.heightCm),
          currentWeightKg: parseFloat(form.currentWeightKg),
          weightGoalKg: smartGoal,
          activityLevel: form.activityLevel,
          trainDays: form.trainDays.join(","),
          trainTime: form.trainTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al guardar los datos");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-8 h-8 bg-[#1A1A18] rounded-[6px] flex items-center justify-center">
            <Activity size={16} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-medium text-[#1A1A18] text-lg">FitTrack</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-[#1A1A18]" : "bg-[#E0DFD9]"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.08)] p-6">
          {/* Step 1: Personal data */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-medium text-[#1A1A18] mb-1">
                Datos personales
              </h2>
              <p className="text-sm text-[#6B6B65] mb-6">
                Paso 1 de 4 — Necesitamos conocerte un poco
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => handleChange("birthDate", e.target.value)}
                    className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] focus:outline-none focus:border-[#1A1A18]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                    Sexo biológico
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "male", label: "Masculino" },
                      { value: "female", label: "Femenino" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChange("sex", opt.value)}
                        className={`flex-1 h-9 rounded-[8px] text-sm font-medium transition-colors border ${
                          form.sex === opt.value
                            ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                            : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={form.heightCm}
                    onChange={(e) => handleChange("heightCm", e.target.value)}
                    placeholder="170"
                    min={100}
                    max={250}
                    className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Physical goals */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-medium text-[#1A1A18] mb-1">
                Tu cuerpo
              </h2>
              <p className="text-sm text-[#6B6B65] mb-6">
                Paso 2 de 4 — Para calcular tus métricas
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                    Peso actual (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.currentWeightKg}
                    onChange={(e) => handleChange("currentWeightKg", e.target.value)}
                    placeholder="75.0"
                    min={30}
                    max={300}
                    className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18]"
                  />
                </div>

                {/* Live BMI display */}
                {bmi > 0 && (
                  <div className="bg-[#F0EFE9] rounded-[10px] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[#6B6B65]">IMC calculado</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getBMIBadgeColor(bmi)}`}>
                        {bmiCategory}
                      </span>
                    </div>
                    <p className={`text-3xl font-mono font-medium ${getBMIColor(bmi)}`}>
                      {bmi.toFixed(1)}
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-1 text-center">
                      {[
                        { label: "Bajo peso", range: "<18.5", active: bmi < 18.5, color: "bg-[#E6F1FB]" },
                        { label: "Normal", range: "18.5-24.9", active: bmi >= 18.5 && bmi < 25, color: "bg-[#EAF3DE]" },
                        { label: "Sobrepeso", range: "25-29.9", active: bmi >= 25 && bmi < 30, color: "bg-[#FEF3E2]" },
                        { label: "Obesidad", range: "≥30", active: bmi >= 30, color: "bg-[#FCEBEB]" },
                      ].map((cat) => (
                        <div
                          key={cat.label}
                          className={`rounded-[6px] p-1.5 ${cat.active ? cat.color : "bg-white/50"}`}
                        >
                          <p className="text-[9px] font-medium text-[#6B6B65] leading-tight">{cat.label}</p>
                          <p className="text-[9px] text-[#A0A09A]">{cat.range}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-[#A0A09A]">
                  El peso objetivo se calculará automáticamente basado en tu IMC y el rango saludable.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Lifestyle */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-medium text-[#1A1A18] mb-1">
                Tu estilo de vida
              </h2>
              <p className="text-sm text-[#6B6B65] mb-6">
                Paso 3 de 4 — ¿Cuándo y cómo entrenás?
              </p>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-2">
                    Nivel de actividad
                  </label>
                  <div className="space-y-2">
                    {ACTIVITY_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => handleChange("activityLevel", level.value)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-sm border transition-colors ${
                          form.activityLevel === level.value
                            ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                            : "bg-white text-[#1A1A18] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                        }`}
                      >
                        <span className="font-medium">{level.label}</span>
                        <span
                          className={`text-xs ${
                            form.activityLevel === level.value
                              ? "text-white/70"
                              : "text-[#A0A09A]"
                          }`}
                        >
                          {level.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-2">
                    Días disponibles para entrenar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-[8px] text-sm font-medium border transition-colors ${
                          form.trainDays.includes(day)
                            ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                            : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                        }`}
                      >
                        {day.slice(0, 1)}
                      </button>
                    ))}
                  </div>
                  {form.trainDays.length > 0 && (
                    <p className="text-xs text-[#6B6B65] mt-2">
                      {form.trainDays.join(", ")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-[#6B6B65] block mb-2">
                    Horario preferido
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "morning", label: "Mañana", emoji: "🌅" },
                      { value: "night", label: "Noche", emoji: "🌙" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChange("trainTime", opt.value)}
                        className={`flex-1 h-12 rounded-[8px] text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                          form.trainTime === opt.value
                            ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                            : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Smart Goal */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-medium text-[#1A1A18] mb-1">
                Tu plan personalizado
              </h2>
              <p className="text-sm text-[#6B6B65] mb-6">
                Paso 4 de 4 — Esto es lo que calculamos para vos
              </p>

              <div className="space-y-3 mb-4">
                {/* BMI */}
                <div className="bg-[#F0EFE9] rounded-[10px] p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#6B6B65]">IMC actual</p>
                    <p className={`text-xl font-mono font-medium ${getBMIColor(bmi)}`}>
                      {bmi.toFixed(1)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getBMIBadgeColor(bmi)}`}>
                    {bmiCategory}
                  </span>
                </div>

                {/* Weight metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F0EFE9] rounded-[10px] p-3">
                    <p className="text-xs text-[#6B6B65] mb-1">Peso ideal (Devine)</p>
                    <p className="text-xl font-mono font-medium text-[#1A1A18]">
                      {idealWeight.toFixed(1)} kg
                    </p>
                  </div>

                  <div className="bg-[#EAF3DE] rounded-[10px] p-3">
                    <p className="text-xs text-[#3B6D11] mb-1">Peso objetivo</p>
                    <p className="text-xl font-mono font-medium text-[#3B6D11]">
                      {smartGoal} kg
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#6B6B65] px-1">
                  Tu peso ideal es <span className="font-medium text-[#1A1A18]">{smartGoal} kg</span> (IMC 22.0 — rango saludable).{" "}
                  Para llegar a IMC normal de 24.0.
                </p>

                {/* Caloric metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#F0EFE9] rounded-[10px] p-3">
                    <p className="text-xs text-[#6B6B65] mb-1">TMB</p>
                    <p className="text-xl font-mono font-medium text-[#1A1A18]">
                      {Math.round(bmr).toLocaleString()} kcal
                    </p>
                    <p className="text-xs text-[#A0A09A] mt-0.5">Metabolismo basal</p>
                  </div>

                  <div className="bg-[#F0EFE9] rounded-[10px] p-3">
                    <p className="text-xs text-[#6B6B65] mb-1">TDEE</p>
                    <p className="text-xl font-mono font-medium text-[#1A1A18]">
                      {Math.round(tdee).toLocaleString()} kcal
                    </p>
                    <p className="text-xs text-[#A0A09A] mt-0.5">Con actividad</p>
                  </div>

                  <div className="bg-[#EAF3DE] rounded-[10px] p-3">
                    <p className="text-xs text-[#3B6D11] mb-1">Calorías objetivo</p>
                    <p className="text-xl font-mono font-medium text-[#3B6D11]">
                      {targetCalories.toLocaleString()} kcal
                    </p>
                    <p className="text-xs text-[#3B6D11]/70 mt-0.5">TDEE - 500</p>
                  </div>

                  <div className="bg-[#E6F1FB] rounded-[10px] p-3">
                    <p className="text-xs text-[#185FA5] mb-1">Proteína diaria</p>
                    <p className="text-xl font-mono font-medium text-[#185FA5]">
                      {proteinTarget}g
                    </p>
                    <p className="text-xs text-[#185FA5]/70 mt-0.5">1.8g × kg</p>
                  </div>
                </div>

                {/* Timeline */}
                {daysToGoal > 0 && goalDate && (
                  <div className="bg-[#F0EFE9] rounded-[10px] p-4">
                    <p className="text-xs text-[#6B6B65] mb-1">Estimado para llegar al objetivo</p>
                    <p className="text-2xl font-mono font-medium text-[#1A1A18]">
                      {daysToGoal} días
                    </p>
                    <p className="text-xs text-[#6B6B65] mt-1">
                      ~{Math.round(daysToGoal / 7)} semanas · Fecha estimada: {formatDate(goalDate)}
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-[#FCEBEB] rounded-[8px] text-sm text-[#A32D2D]">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-[rgba(0,0,0,0.08)]">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium text-[#6B6B65] hover:bg-[#F0EFE9] transition-colors disabled:opacity-0"
            >
              <ChevronLeft size={16} />
              Atrás
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-[8px] text-sm font-medium bg-[#3B6D11] text-white hover:bg-[#3B6D11]/85 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                Empezar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
