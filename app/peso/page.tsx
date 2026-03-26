"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Plus, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import { projectWeightData } from "@/lib/calculations";

interface WeightLog {
  id: number;
  weightKg: number;
  loggedAt: string;
}

interface WeightPageData {
  weightLogs: WeightLog[];
  weightGoalKg: number;
  projections: { date: string; projected: number }[];
}

function PesoPageInner() {
  const searchParams = useSearchParams();
  const weightInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<WeightPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    const res = await fetch("/api/weight");
    const d = await res.json();
    setData(d);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Auto-focus weight input when ?accion=registrar is in URL
  useEffect(() => {
    if (!loading && searchParams.get("accion") === "registrar") {
      weightInputRef.current?.focus();
      weightInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, searchParams]);

  async function handleAddWeight(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      setError("Ingresá un peso válido entre 30 y 300 kg");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: weight }),
      });
      if (res.ok) {
        setNewWeight("");
        await loadData();
      }
    } finally {
      setAddLoading(false);
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

  const logs = data?.weightLogs || [];
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );

  const latestWeight = sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].weightKg : null;
  const firstWeight = sortedLogs.length > 0 ? sortedLogs[0].weightKg : null;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  // Build chart data
  const chartData = sortedLogs.map((log) => ({
    date: formatDateShort(log.loggedAt),
    weight: log.weightKg,
    projected: undefined as number | undefined,
  }));

  // Projections
  const projections = data?.projections || [];
  const fullChartData = [
    ...chartData,
    ...projections.map((p) => ({
      date: formatDateShort(p.date),
      weight: undefined as number | undefined,
      projected: p.projected,
    })),
  ];

  const allWeights = [
    ...sortedLogs.map((l) => l.weightKg),
    ...projections.map((p) => p.projected),
    data?.weightGoalKg || 0,
  ].filter(Boolean);

  const minWeight = Math.max(0, Math.min(...allWeights) - 2);
  const maxWeight = Math.max(...allWeights) + 2;

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#1A1A18]">Peso</h1>
        <p className="text-sm text-[#6B6B65] mt-0.5">
          Seguimiento de tu progreso corporal
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-xs text-[#6B6B65] mb-1">Peso actual</p>
          <p className="text-2xl font-mono font-medium text-[#1A1A18]">
            {latestWeight ? `${latestWeight}` : "—"}
          </p>
          <p className="text-xs text-[#A0A09A] mt-0.5">kg</p>
        </div>
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-xs text-[#6B6B65] mb-1">Objetivo</p>
          <p className="text-2xl font-mono font-medium text-[#185FA5]">
            {data?.weightGoalKg || "—"}
          </p>
          <p className="text-xs text-[#A0A09A] mt-0.5">kg</p>
        </div>
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-xs text-[#6B6B65] mb-1">Cambio total</p>
          <div className="flex items-center gap-1.5">
            <p
              className={`text-2xl font-mono font-medium ${
                weightChange && weightChange < 0
                  ? "text-[#3B6D11]"
                  : "text-[#A32D2D]"
              }`}
            >
              {weightChange
                ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)}`
                : "—"}
            </p>
            {weightChange !== null && (
              weightChange < 0 ? (
                <TrendingDown size={16} className="text-[#3B6D11]" />
              ) : (
                <TrendingUp size={16} className="text-[#A32D2D]" />
              )
            )}
          </div>
          <p className="text-xs text-[#A0A09A] mt-0.5">kg</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.08)] p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-[#1A1A18]">Evolución del peso</p>
          <div className="flex gap-4 text-xs text-[#6B6B65]">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-[#1A1A18]" />
              <span>Real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-[#A0A09A] border-dashed border-t" />
              <span>Proyección</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-[#3B6D11] border-dashed border-t" />
              <span>Objetivo</span>
            </div>
          </div>
        </div>

        {fullChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={fullChartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#A0A09A" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[minWeight, maxWeight]}
                tick={{ fontSize: 11, fill: "#A0A09A", fontFamily: "DM Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#6B6B65", fontSize: 11 }}
              />
              {data?.weightGoalKg && (
                <ReferenceLine
                  y={data.weightGoalKg}
                  stroke="#3B6D11"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#1A1A18"
                strokeWidth={2}
                dot={{ fill: "#1A1A18", r: 3, strokeWidth: 0 }}
                connectNulls={false}
                name="Real"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#A0A09A"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
                name="Proyección"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-sm text-[#A0A09A]">
            Registrá tu peso para ver la gráfica
          </div>
        )}
      </div>

      {/* Add weight form */}
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4 mb-6">
        <p className="text-sm font-medium text-[#1A1A18] mb-3">
          Registrar peso
        </p>
        {error && (
          <div className="mb-3 p-2.5 bg-[#FCEBEB] rounded-[8px] text-xs text-[#A32D2D]">
            {error}
          </div>
        )}
        <form onSubmit={handleAddWeight} className="flex gap-2">
          <input
            ref={weightInputRef}
            type="number"
            step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder="Ej: 78.5"
            min={30}
            max={300}
            required
            className="flex-1 h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
          />
          <button
            type="submit"
            disabled={addLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
          >
            {addLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Registrar
          </button>
        </form>
      </div>

      {/* Log history */}
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
        <p className="text-sm font-medium text-[#1A1A18] mb-3">Historial</p>
        {sortedLogs.length === 0 ? (
          <p className="text-sm text-[#A0A09A]">
            Todavía no registraste ningún peso.
          </p>
        ) : (
          <div className="space-y-0">
            {[...sortedLogs].reverse().map((log, i) => {
              const prev = [...sortedLogs].reverse()[i + 1];
              const diff = prev ? log.weightKg - prev.weightKg : null;
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2.5 border-b border-[rgba(0,0,0,0.05)] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-mono font-medium text-[#1A1A18]">
                        {log.weightKg} kg
                      </p>
                      <p className="text-xs text-[#A0A09A]">
                        {formatDateShort(log.loggedAt)}
                      </p>
                    </div>
                  </div>
                  {diff !== null && (
                    <span
                      className={`text-xs font-mono font-medium ${
                        diff < 0 ? "text-[#3B6D11]" : "text-[#A32D2D]"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function PesoPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#1A1A18] border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    }>
      <PesoPageInner />
    </Suspense>
  );
}
