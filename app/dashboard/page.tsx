"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  TrendingDown,
  TrendingUp,
  Flame,
  Target,
  Activity,
} from "lucide-react";
import {
  calculateTargetCalories,
  calculateTDEE,
  calculateBMR,
  calculateDaysToGoal,
  calculateGoalDate,
  calculateAge,
} from "@/lib/calculations";
import { formatDate, formatDateShort, getDayName } from "@/lib/utils";

interface DashboardData {
  user: {
    name: string;
    weightGoalKg: number;
    heightCm: number;
    sex: string;
    birthDate: string;
    activityLevel: string;
    trainDays: string;
  };
  latestWeight: number | null;
  previousWeight: number | null;
  todayCalories: number;
  todayProtein: number;
  streakDays: number;
  sessions: { date: string; completed: boolean; routineName: string }[];
  weightLogs: { weightKg: number; loggedAt: string }[];
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: "green" | "red" | "blue" | "amber";
}) {
  const accentColors: Record<string, string> = {
    green: "text-[#3B6D11]",
    red: "text-[#A32D2D]",
    blue: "text-[#185FA5]",
    amber: "text-[#BA7517]",
  };

  return (
    <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#6B6B65]">{label}</p>
        <div className="w-7 h-7 bg-[#F0EFE9] rounded-[6px] flex items-center justify-center">
          <Icon size={14} className="text-[#6B6B65]" />
        </div>
      </div>
      <p
        className={`text-2xl font-mono font-medium ${
          accent ? accentColors[accent] : "text-[#1A1A18]"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[#A0A09A] mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dashboard?start=${new Date(new Date().setHours(0,0,0,0)).toISOString()}&end=${new Date(new Date().setHours(23,59,59,999)).toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#1A1A18] border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <p className="text-[#6B6B65]">Error al cargar los datos.</p>
      </MainLayout>
    );
  }

  const { user } = data;
  const trainDays = user.trainDays ? user.trainDays.split(",") : [];
  const today = getDayName(new Date());
  const isTrainDay = trainDays.includes(today);

  const weightDiff =
    data.latestWeight && data.previousWeight
      ? data.latestWeight - data.previousWeight
      : null;

  const age = calculateAge(new Date(user.birthDate));
  const bmr = data.latestWeight
    ? calculateBMR(data.latestWeight, user.heightCm, age, user.sex)
    : 0;
  const tdee = bmr ? calculateTDEE(bmr, user.activityLevel) : 0;
  const targetCalories = tdee ? calculateTargetCalories(tdee) : 0;
  const daysToGoal =
    data.latestWeight && user.weightGoalKg
      ? calculateDaysToGoal(data.latestWeight, user.weightGoalKg)
      : 0;
  const goalDate = daysToGoal ? calculateGoalDate(daysToGoal) : null;

  const calPercentage = targetCalories
    ? Math.min(Math.round((data.todayCalories / targetCalories) * 100), 100)
    : 0;

  const proteinTarget = data.latestWeight
    ? Math.round(1.8 * data.latestWeight)
    : 0;

  const proteinPercentage = proteinTarget
    ? Math.min(Math.round((data.todayProtein / proteinTarget) * 100), 100)
    : 0;

  // Build last 28 days for streak dots
  const last28 = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return d;
  });

  const sessionMap = new Map<string, { completed: boolean }>();
  data.sessions.forEach((s) => {
    const key = new Date(s.date).toISOString().split("T")[0];
    sessionMap.set(key, { completed: s.completed });
  });

  const todaySession = data.sessions.find((s) => {
    const d = new Date(s.date);
    const t = new Date();
    return (
      d.getDate() === t.getDate() &&
      d.getMonth() === t.getMonth() &&
      d.getFullYear() === t.getFullYear()
    );
  });

  const startWeight = data.weightLogs.length > 0
    ? data.weightLogs[data.weightLogs.length - 1].weightKg
    : data.latestWeight;

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#1A1A18]">
          Hola, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-[#6B6B65] mt-0.5">
          {isTrainDay
            ? `Hoy toca entrenar — ${today}`
            : `Hoy es día de descanso — ${today}`}
        </p>
      </div>

      {/* Today workout banner */}
      {isTrainDay && (
        <div className="bg-[#1A1A18] rounded-[14px] p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs font-medium mb-1">
              Sesión de hoy
            </p>
            <p className="text-white font-medium text-base">
              {todaySession?.routineName || "Entrenamiento"}
            </p>
            <p className="text-white/50 text-xs mt-1">Dale con todo, che 💪</p>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-[10px] flex items-center justify-center">
            <Activity size={22} color="white" />
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Peso actual"
          value={data.latestWeight ? `${data.latestWeight} kg` : "—"}
          sub={
            weightDiff !== null
              ? `${weightDiff > 0 ? "+" : ""}${weightDiff.toFixed(1)} kg vs anterior`
              : "Sin registros"
          }
          icon={
            weightDiff !== null && weightDiff < 0 ? TrendingDown : TrendingUp
          }
          accent={
            weightDiff !== null && weightDiff < 0 ? "green" : undefined
          }
        />

        <MetricCard
          label="Días al objetivo"
          value={daysToGoal > 0 ? `${daysToGoal}` : "—"}
          sub={goalDate ? formatDate(goalDate) : "¡Objetivo alcanzado!"}
          icon={Target}
          accent="blue"
        />

        <MetricCard
          label="Racha actual"
          value={`${data.streakDays}`}
          sub={data.streakDays === 1 ? "día seguido" : "días seguidos"}
          icon={Flame}
          accent={data.streakDays >= 7 ? "amber" : undefined}
        />

        <MetricCard
          label="Calorías hoy"
          value={`${Math.round(data.todayCalories)}`}
          sub={`Objetivo: ${targetCalories} kcal`}
          icon={Activity}
          accent={
            calPercentage >= 90 ? "green" : calPercentage >= 110 ? "red" : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Weight progress */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-xs font-medium text-[#6B6B65] mb-4">
            Progreso de peso
          </p>
          {data.latestWeight && user.weightGoalKg ? (
            <>
              <div className="flex justify-between text-xs text-[#A0A09A] mb-2">
                <span>Actual: {data.latestWeight} kg</span>
                <span>Objetivo: {user.weightGoalKg} kg</span>
              </div>
              <div className="h-2 bg-[#F0EFE9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3B6D11] rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        startWeight && startWeight > user.weightGoalKg
                          ? ((startWeight - data.latestWeight) /
                              (startWeight - user.weightGoalKg)) *
                              100
                          : 0
                      )
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[#6B6B65] mt-2">
                Perdiste{" "}
                <span className="font-mono font-medium text-[#3B6D11]">
                  {startWeight
                    ? (startWeight - data.latestWeight).toFixed(1)
                    : "0"}{" "}
                  kg
                </span>{" "}
                desde el inicio
              </p>
            </>
          ) : (
            <p className="text-sm text-[#A0A09A]">
              Registrá tu peso para ver el progreso
            </p>
          )}
        </div>

        {/* Nutrition progress */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-xs font-medium text-[#6B6B65] mb-4">
            Nutrición de hoy
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#6B6B65]">Calorías</span>
                <span className="font-mono text-[#1A1A18]">
                  {Math.round(data.todayCalories)} / {targetCalories} kcal
                </span>
              </div>
              <div className="h-1.5 bg-[#F0EFE9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A1A18] rounded-full"
                  style={{ width: `${calPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#6B6B65]">Proteína</span>
                <span className="font-mono text-[#185FA5]">
                  {Math.round(data.todayProtein)}g / {proteinTarget}g
                </span>
              </div>
              <div className="h-1.5 bg-[#E6F1FB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#185FA5] rounded-full"
                  style={{ width: `${proteinPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 28-day streak dots */}
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
        <p className="text-xs font-medium text-[#6B6B65] mb-4">
          Últimos 28 días
        </p>
        <div className="flex flex-wrap gap-1.5">
          {last28.map((date, i) => {
            const key = date.toISOString().split("T")[0];
            const sess = sessionMap.get(key);
            const dayName = getDayName(date);
            const isRest = !trainDays.includes(dayName);
            const isPast = date < new Date() && date.toDateString() !== new Date().toDateString();
            const isCurrentDay =
              date.toDateString() === new Date().toDateString();

            let dotClass = "w-6 h-6 rounded-full ";
            if (isCurrentDay) {
              dotClass += "border-2 border-[#1A1A18] bg-white";
            } else if (sess?.completed) {
              dotClass += "bg-[#1A1A18]";
            } else if (isPast && !isRest) {
              dotClass += "bg-[#FCEBEB]";
            } else {
              dotClass += "bg-[#F0EFE9]";
            }

            return (
              <div
                key={i}
                className={dotClass}
                title={`${formatDateShort(date)}${
                  sess?.completed ? " — Completado" : ""
                }`}
              />
            );
          })}
        </div>
        <div className="flex gap-4 mt-3">
          {[
            { color: "bg-[#1A1A18]", label: "Entrenado" },
            { color: "bg-[#FCEBEB]", label: "Faltado" },
            { color: "bg-[#F0EFE9]", label: "Descanso" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-xs text-[#A0A09A]">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
