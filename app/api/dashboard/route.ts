import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const [user, weightLogs, sessions, todayFoodLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          weightGoalKg: true,
          heightCm: true,
          sex: true,
          birthDate: true,
          activityLevel: true,
          trainDays: true,
        },
      }),
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { loggedAt: "asc" },
      }),
      prisma.trainingSession.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 60,
      }),
      prisma.foodLog.findMany({
        where: {
          userId,
          loggedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const sortedWeights = weightLogs.sort(
      (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    );

    const latestWeight = sortedWeights[0]?.weightKg ?? null;
    const previousWeight = sortedWeights[1]?.weightKg ?? null;

    const todayCalories = todayFoodLogs.reduce((acc, log) => acc + log.kcal, 0);
    const todayProtein = todayFoodLogs.reduce((acc, log) => acc + log.protein, 0);

    // Calculate streak
    let streakDays = 0;
    const trainDaysList = user.trainDays ? user.trainDays.split(",") : [];
    const completedDatesSet = new Set(
      sessions
        .filter((s) => s.completed)
        .map((s) => new Date(s.date).toISOString().split("T")[0])
    );

    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][d.getDay()];
      const key = d.toISOString().split("T")[0];

      if (trainDaysList.includes(dayName)) {
        if (completedDatesSet.has(key)) {
          streakDays++;
        } else if (i > 0) {
          break;
        }
      }
    }

    return NextResponse.json({
      user,
      latestWeight,
      previousWeight,
      todayCalories,
      todayProtein,
      streakDays,
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        routineName: s.routineName,
        completed: s.completed,
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
      weightLogs: weightLogs.map((w) => ({
        weightKg: w.weightKg,
        loggedAt: w.loggedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
