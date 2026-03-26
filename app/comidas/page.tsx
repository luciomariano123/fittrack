"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { X, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface FoodLog {
  id: number;
  meal: string;
  foodName: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
}

const MEALS = [
  { key: "Desayuno", emoji: "☀️", hint: "Ej: café con leche, tostadas con palta" },
  { key: "Almuerzo", emoji: "🍽️", hint: "Ej: pollo con arroz y ensalada" },
  { key: "Merienda", emoji: "🍎", hint: "Ej: fruta, yogur, mate con galletitas" },
  { key: "Cena", emoji: "🌙", hint: "Ej: milanesa con papas, fideos con tuco" },
  { key: "Snacks", emoji: "🥜", hint: "Ej: maní, barra de cereal, fruta" },
];

const QUALITY = [
  { key: "bien", label: "Comí bien", color: "bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]" },
  { key: "mas_o_menos", label: "Más o menos", color: "bg-[#FAEEDA] text-[#BA7517] border-[#BA7517]" },
  { key: "mal", label: "Comí mal", color: "bg-[#FCEBEB] text-[#A32D2D] border-[#A32D2D]" },
];

// Calorie estimates by meal + portion
const CALORIE_ESTIMATES: Record<string, Record<string, number>> = {
  Desayuno:  { poco: 150, normal: 300, bastante: 500 },
  Almuerzo:  { poco: 350, normal: 600, bastante: 900 },
  Merienda:  { poco: 80,  normal: 200, bastante: 350 },
  Cena:      { poco: 300, normal: 550, bastante: 800 },
  Snacks:    { poco: 80,  normal: 180, bastante: 300 },
};

const PROTEIN_ESTIMATES: Record<string, Record<string, number>> = {
  Desayuno:  { poco: 8,  normal: 15, bastante: 22 },
  Almuerzo:  { poco: 20, normal: 35, bastante: 50 },
  Merienda:  { poco: 3,  normal: 8,  bastante: 14 },
  Cena:      { poco: 18, normal: 30, bastante: 45 },
  Snacks:    { poco: 3,  normal: 7,  bastante: 12 },
};

export default function ComidasPage() {
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [targetCalories, setTargetCalories] = useState(0);
  const [proteinTarget, setProteinTarget] = useState(0);

  // Per-meal form state
  const [mealDesc, setMealDesc] = useState<Record<string, string>>({});
  const [mealQuality, setMealQuality] = useState<Record<string, string>>({});
  const [mealPortion, setMealPortion] = useState<Record<string, string>>({});

  async function loadData() {
    const start = new Date(new Date().setHours(0,0,0,0)).toISOString();
    const end = new Date(new Date().setHours(23,59,59,999)).toISOString();
    const [foodRes, dashRes] = await Promise.all([
      fetch(`/api/food?start=${start}&end=${end}`),
      fetch(`/api/dashboard?start=${start}&end=${end}`),
    ]);
    const foodData = await foodRes.json();
    const dashData = await dashRes.json();
    setFoodLogs(foodData.foodLogs || []);
    const { latestWeight } = dashData;
    if (latestWeight) {
      setProteinTarget(Math.round(1.8 * latestWeight));
      setTargetCalories(dashData.user?.targetCalories || 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // Auto-expand current meal based on time
    const hour = new Date().getHours();
    if (hour < 10) setExpandedMeal("Desayuno");
    else if (hour < 14) setExpandedMeal("Almuerzo");
    else if (hour < 18) setExpandedMeal("Merienda");
    else setExpandedMeal("Cena");
  }, []);

  async function handleSave(meal: string) {
    const desc = mealDesc[meal]?.trim();
    if (!desc) return;

    const portion = mealPortion[meal] || "normal";
    const quality = mealQuality[meal] || "bien";
    const kcal = CALORIE_ESTIMATES[meal]?.[portion] || 400;
    const protein = PROTEIN_ESTIMATES[meal]?.[portion] || 20;
    const carbs = kcal * 0.45 / 4;
    const fat = kcal * 0.25 / 9;

    // Add quality tag to description
    const qualityLabel = QUALITY.find(q => q.key === quality)?.label || "";
    const foodName = `${desc} (${qualityLabel.toLowerCase()})`;

    setSaving(meal);
    try {
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal,
          foodName,
          grams: portion === "poco" ? 150 : portion === "bastante" ? 400 : 250,
          kcal,
          protein,
          carbs,
          fat,
        }),
      });
      if (res.ok) {
        setMealDesc(prev => ({ ...prev, [meal]: "" }));
        setMealQuality(prev => ({ ...prev, [meal]: "" }));
        setMealPortion(prev => ({ ...prev, [meal]: "" }));
        await loadData();
      }
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/food/${id}`, { method: "DELETE" });
    setFoodLogs(prev => prev.filter(f => f.id !== id));
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

  const totals = foodLogs.reduce(
    (acc, log) => ({ kcal: acc.kcal + log.kcal, protein: acc.protein + log.protein }),
    { kcal: 0, protein: 0 }
  );

  const calPct = targetCalories ? Math.min((totals.kcal / targetCalories) * 100, 100) : 0;
  const protPct = proteinTarget ? Math.min((totals.protein / proteinTarget) * 100, 100) : 0;

  const logsByMeal = new Map<string, FoodLog[]>();
  MEALS.forEach(m => logsByMeal.set(m.key, []));
  foodLogs.forEach(log => {
    const arr = logsByMeal.get(log.meal) || [];
    arr.push(log);
    logsByMeal.set(log.meal, arr);
  });

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#1A1A18]">Comidas</h1>
        <p className="text-sm text-[#6B6B65] mt-0.5">¿Qué comiste hoy?</p>
      </div>

      {/* Daily summary */}
      <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.08)] p-4 mb-4">
        <p className="text-xs font-medium text-[#6B6B65] mb-3">Resumen del día</p>
        <div className="space-y-2.5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#6B6B65]">Calorías estimadas</span>
              <span className="font-mono text-[#1A1A18]">
                {Math.round(totals.kcal)}{targetCalories ? ` / ${targetCalories}` : ""} kcal
              </span>
            </div>
            <div className="h-1.5 bg-[#F0EFE9] rounded-full overflow-hidden">
              <div className="h-full bg-[#1A1A18] rounded-full transition-all" style={{ width: `${calPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#6B6B65]">Proteína estimada</span>
              <span className="font-mono text-[#185FA5]">
                {Math.round(totals.protein)}{proteinTarget ? ` / ${proteinTarget}` : ""} g
              </span>
            </div>
            <div className="h-1.5 bg-[#E6F1FB] rounded-full overflow-hidden">
              <div className="h-full bg-[#185FA5] rounded-full transition-all" style={{ width: `${protPct}%` }} />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-[#A0A09A] mt-2">Estimaciones basadas en las porciones registradas</p>
      </div>

      {/* Meals */}
      <div className="space-y-2">
        {MEALS.map(({ key: meal, emoji, hint }) => {
          const mealLogs = logsByMeal.get(meal) || [];
          const isExpanded = expandedMeal === meal;
          const mealKcal = mealLogs.reduce((a, b) => a + b.kcal, 0);

          return (
            <div key={meal} className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedMeal(isExpanded ? null : meal)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F0EFE9]/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{emoji}</span>
                  <span className="text-sm font-medium text-[#1A1A18]">{meal}</span>
                  {mealLogs.length > 0 && (
                    <span className="text-xs text-[#A0A09A]">· {Math.round(mealKcal)} kcal</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {mealLogs.length > 0 && (
                    <span className="text-xs bg-[#EAF3DE] text-[#3B6D11] px-2 py-0.5 rounded-full">
                      {mealLogs.length} {mealLogs.length === 1 ? "registro" : "registros"}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={15} className="text-[#A0A09A]" /> : <ChevronDown size={15} className="text-[#A0A09A]" />}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[rgba(0,0,0,0.06)] px-4 py-3 space-y-3">

                  {/* Existing logs */}
                  {mealLogs.length > 0 && (
                    <div className="space-y-1.5 mb-1">
                      {mealLogs.map(log => (
                        <div key={log.id} className="flex items-center justify-between bg-[#F0EFE9] rounded-[8px] px-3 py-2">
                          <div>
                            <p className="text-xs font-medium text-[#1A1A18]">{log.foodName}</p>
                            <p className="text-[10px] text-[#A0A09A]">≈ {Math.round(log.kcal)} kcal · P: {Math.round(log.protein)}g</p>
                          </div>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-1 rounded-[6px] hover:bg-[#FCEBEB] text-[#A0A09A] hover:text-[#A32D2D] transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add entry form */}
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-[#6B6B65]">¿Qué comiste?</p>

                    <textarea
                      value={mealDesc[meal] || ""}
                      onChange={e => setMealDesc(prev => ({ ...prev, [meal]: e.target.value }))}
                      placeholder={hint}
                      rows={2}
                      className="w-full rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1A1A18] resize-none"
                    />

                    {/* Quality */}
                    <div>
                      <p className="text-xs text-[#6B6B65] mb-1.5">¿Cómo comiste?</p>
                      <div className="flex gap-1.5">
                        {QUALITY.map(q => (
                          <button
                            key={q.key}
                            onClick={() => setMealQuality(prev => ({ ...prev, [meal]: q.key }))}
                            className={`flex-1 py-1.5 rounded-[8px] text-xs font-medium border transition-colors ${
                              mealQuality[meal] === q.key ? q.color : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)]"
                            }`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Portion */}
                    <div>
                      <p className="text-xs text-[#6B6B65] mb-1.5">¿Cuánto?</p>
                      <div className="flex gap-1.5">
                        {[
                          { key: "poco", label: "Poco", sub: `~${CALORIE_ESTIMATES[meal]?.poco} kcal` },
                          { key: "normal", label: "Normal", sub: `~${CALORIE_ESTIMATES[meal]?.normal} kcal` },
                          { key: "bastante", label: "Bastante", sub: `~${CALORIE_ESTIMATES[meal]?.bastante} kcal` },
                        ].map(p => (
                          <button
                            key={p.key}
                            onClick={() => setMealPortion(prev => ({ ...prev, [meal]: p.key }))}
                            className={`flex-1 py-1.5 rounded-[8px] text-xs font-medium border transition-colors ${
                              mealPortion[meal] === p.key
                                ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                                : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                            }`}
                          >
                            <span className="block">{p.label}</span>
                            <span className="block text-[10px] opacity-60 mt-0.5">{p.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSave(meal)}
                      disabled={!mealDesc[meal]?.trim() || saving === meal}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white disabled:opacity-40 transition-colors"
                    >
                      {saving === meal ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
