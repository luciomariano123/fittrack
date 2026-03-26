"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Plus, Search, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { FoodItem } from "@/lib/food-database";

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
  { key: "Desayuno", emoji: "☀️" },
  { key: "Almuerzo", emoji: "🥗" },
  { key: "Merienda", emoji: "🍎" },
  { key: "Cena", emoji: "🌙" },
  { key: "Snacks", emoji: "🥜" },
];

export default function ComidasPage() {
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMeal, setExpandedMeal] = useState<string | null>("Almuerzo");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState("100");
  const [selectedMeal, setSelectedMeal] = useState("Almuerzo");
  const [addLoading, setAddLoading] = useState(false);
  const [targetCalories, setTargetCalories] = useState(0);
  const [proteinTarget, setProteinTarget] = useState(0);

  async function loadData() {
    const [foodRes, dashRes] = await Promise.all([
      fetch("/api/food"),
      fetch("/api/dashboard"),
    ]);
    const foodData = await foodRes.json();
    const dashData = await dashRes.json();
    setFoodLogs(foodData.foodLogs || []);

    const { user, latestWeight } = dashData;
    if (latestWeight && user) {
      // Simple estimate
      setProteinTarget(Math.round(1.8 * latestWeight));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.results || []);
    setSearching(false);
  }

  function handleSelectFood(food: FoodItem) {
    setSelectedFood(food);
    setSearchQuery(food.name);
    setSearchResults([]);
  }

  async function handleAddFood(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFood) return;
    setAddLoading(true);

    const gramsNum = parseFloat(grams);
    const factor = gramsNum / 100;

    try {
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal: selectedMeal,
          foodName: selectedFood.name,
          grams: gramsNum,
          kcal: selectedFood.kcal * factor,
          protein: selectedFood.protein * factor,
          carbs: selectedFood.carbs * factor,
          fat: selectedFood.fat * factor,
        }),
      });

      if (res.ok) {
        setSelectedFood(null);
        setSearchQuery("");
        setGrams("100");
        await loadData();
      }
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/food/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFoodLogs((prev) => prev.filter((f) => f.id !== id));
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

  const totals = foodLogs.reduce(
    (acc, log) => ({
      kcal: acc.kcal + log.kcal,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calPct = targetCalories ? Math.min((totals.kcal / targetCalories) * 100, 100) : 0;
  const protPct = proteinTarget ? Math.min((totals.protein / proteinTarget) * 100, 100) : 0;

  const logsByMeal = new Map<string, FoodLog[]>();
  MEALS.forEach((m) => logsByMeal.set(m.key, []));
  foodLogs.forEach((log) => {
    const arr = logsByMeal.get(log.meal) || [];
    arr.push(log);
    logsByMeal.set(log.meal, arr);
  });

  const gramsNum = parseFloat(grams) || 0;
  const previewKcal = selectedFood
    ? ((selectedFood.kcal * gramsNum) / 100).toFixed(0)
    : "0";
  const previewProt = selectedFood
    ? ((selectedFood.protein * gramsNum) / 100).toFixed(1)
    : "0";

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#1A1A18]">Comidas</h1>
        <p className="text-sm text-[#6B6B65] mt-0.5">
          Registro nutricional de hoy
        </p>
      </div>

      {/* Daily totals */}
      <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.08)] p-4 mb-6">
        <p className="text-xs font-medium text-[#6B6B65] mb-4">Resumen del día</p>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Calorías", value: Math.round(totals.kcal), unit: "kcal", color: "text-[#1A1A18]" },
            { label: "Proteína", value: Math.round(totals.protein), unit: "g", color: "text-[#185FA5]" },
            { label: "Carbos", value: Math.round(totals.carbs), unit: "g", color: "text-[#BA7517]" },
            { label: "Grasas", value: Math.round(totals.fat), unit: "g", color: "text-[#A32D2D]" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-[#A0A09A] mb-0.5">{item.label}</p>
              <p className={`text-lg font-mono font-medium ${item.color}`}>
                {item.value}
              </p>
              <p className="text-xs text-[#A0A09A]">{item.unit}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#6B6B65]">Calorías</span>
              <span className="font-mono text-[#6B6B65]">
                {Math.round(totals.kcal)} / {targetCalories || "—"} kcal
              </span>
            </div>
            <div className="h-1.5 bg-[#F0EFE9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1A1A18] rounded-full"
                style={{ width: `${calPct}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#6B6B65]">Proteína</span>
              <span className="font-mono text-[#6B6B65]">
                {Math.round(totals.protein)} / {proteinTarget || "—"} g
              </span>
            </div>
            <div className="h-1.5 bg-[#E6F1FB] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#185FA5] rounded-full"
                style={{ width: `${protPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add food */}
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4 mb-6">
        <p className="text-sm font-medium text-[#1A1A18] mb-3">Agregar alimento</p>

        <div className="space-y-3">
          {/* Meal selector */}
          <div className="flex gap-2 flex-wrap">
            {MEALS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelectedMeal(m.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-colors ${
                  selectedMeal === m.key
                    ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                    : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                }`}
              >
                {m.emoji} {m.key}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              {searching ? (
                <Loader2 size={14} className="text-[#A0A09A] animate-spin" />
              ) : (
                <Search size={14} className="text-[#A0A09A]" />
              )}
            </div>
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscá un alimento..."
              className="w-full h-9 pl-9 pr-8 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white text-sm focus:outline-none focus:border-[#1A1A18]"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFood(null);
                  setSearchResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X size={14} className="text-[#A0A09A]" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="border border-[rgba(0,0,0,0.08)] rounded-[8px] overflow-hidden">
              {searchResults.map((food) => (
                <button
                  key={food.name}
                  onClick={() => handleSelectFood(food)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-[#F0EFE9] transition-colors border-b border-[rgba(0,0,0,0.05)] last:border-0"
                >
                  <span className="text-[#1A1A18]">{food.name}</span>
                  <span className="text-xs text-[#A0A09A]">
                    {food.kcal} kcal/100g | P: {food.protein}g
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Selected food + grams */}
          {selectedFood && (
            <form onSubmit={handleAddFood} className="space-y-3">
              <div className="bg-[#F0EFE9] rounded-[8px] px-3 py-2">
                <p className="text-xs font-medium text-[#1A1A18]">
                  {selectedFood.name}
                </p>
                <p className="text-xs text-[#6B6B65] mt-0.5">
                  Por 100g: {selectedFood.kcal} kcal | P: {selectedFood.protein}g | C: {selectedFood.carbs}g | G: {selectedFood.fat}g
                </p>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                    Gramos
                  </label>
                  <input
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    min={1}
                    max={2000}
                    className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
                  />
                </div>
                <div className="text-xs text-[#A0A09A] pb-2">
                  ≈ {previewKcal} kcal | P: {previewProt}g
                </div>
              </div>

              <button
                type="submit"
                disabled={addLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
              >
                {addLoading && <Loader2 size={14} className="animate-spin" />}
                <Plus size={14} />
                Agregar
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Meals log */}
      <div className="space-y-2">
        {MEALS.map(({ key: meal, emoji }) => {
          const mealLogs = logsByMeal.get(meal) || [];
          const mealTotals = mealLogs.reduce(
            (a, b) => ({ kcal: a.kcal + b.kcal, protein: a.protein + b.protein }),
            { kcal: 0, protein: 0 }
          );
          const isExpanded = expandedMeal === meal;

          return (
            <div
              key={meal}
              className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] overflow-hidden"
            >
              <button
                onClick={() => setExpandedMeal(isExpanded ? null : meal)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F0EFE9]/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{emoji}</span>
                  <span className="text-sm font-medium text-[#1A1A18]">
                    {meal}
                  </span>
                  {mealLogs.length > 0 && (
                    <span className="text-xs text-[#A0A09A]">
                      {Math.round(mealTotals.kcal)} kcal
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {mealLogs.length > 0 && (
                    <span className="text-xs text-[#185FA5]">
                      P: {Math.round(mealTotals.protein)}g
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp size={15} className="text-[#A0A09A]" />
                  ) : (
                    <ChevronDown size={15} className="text-[#A0A09A]" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[rgba(0,0,0,0.06)] px-4 py-2">
                  {mealLogs.length === 0 ? (
                    <p className="text-xs text-[#A0A09A] py-2">
                      Nada registrado en {meal.toLowerCase()}
                    </p>
                  ) : (
                    <div className="space-y-0">
                      {mealLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)] last:border-0"
                        >
                          <div>
                            <p className="text-sm text-[#1A1A18]">
                              {log.foodName}
                            </p>
                            <p className="text-xs text-[#A0A09A]">
                              {log.grams}g — {Math.round(log.kcal)} kcal | P:{" "}
                              {Math.round(log.protein)}g | C:{" "}
                              {Math.round(log.carbs)}g | G:{" "}
                              {Math.round(log.fat)}g
                            </p>
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
