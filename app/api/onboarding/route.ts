import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const onboardingSchema = z.object({
  name: z.string().min(1).optional(),
  birthDate: z.string(),
  sex: z.enum(["male", "female"]),
  heightCm: z.number().min(100).max(250),
  currentWeightKg: z.number().min(30).max(300),
  weightGoalKg: z.number().min(30).max(300),
  activityLevel: z.string(),
  trainDays: z.string(),
  trainTime: z.string(),
});

const DEFAULT_EXERCISES = [
  // Martes: Cardio + Core
  { name: "Cardio (cinta/bicicleta)", muscleGroup: "Cardio", sets: 1, reps: "30 min", dayOfWeek: "Martes", order: 1 },
  { name: "Crunch abdominal", muscleGroup: "Core", sets: 3, reps: "20 reps", dayOfWeek: "Martes", order: 2 },
  { name: "Plancha frontal", muscleGroup: "Core", sets: 3, reps: "45 seg", dayOfWeek: "Martes", order: 3 },
  { name: "Elevación de piernas", muscleGroup: "Core", sets: 3, reps: "15 reps", dayOfWeek: "Martes", order: 4 },
  { name: "Crunch bicicleta", muscleGroup: "Core", sets: 3, reps: "20 reps", dayOfWeek: "Martes", order: 5 },
  // Miércoles: Tren inferior
  { name: "Sentadillas", muscleGroup: "Piernas", sets: 4, reps: "12 reps", dayOfWeek: "Miércoles", order: 1 },
  { name: "Peso muerto", muscleGroup: "Piernas", sets: 3, reps: "10 reps", dayOfWeek: "Miércoles", order: 2 },
  { name: "Prensa de piernas", muscleGroup: "Piernas", sets: 3, reps: "15 reps", dayOfWeek: "Miércoles", order: 3 },
  { name: "Curl femoral", muscleGroup: "Piernas", sets: 3, reps: "12 reps", dayOfWeek: "Miércoles", order: 4 },
  { name: "Plancha frontal", muscleGroup: "Core", sets: 3, reps: "45 seg", dayOfWeek: "Miércoles", order: 5 },
  // Jueves: Tren superior empuje
  { name: "Press de banca", muscleGroup: "Pecho", sets: 4, reps: "10 reps", dayOfWeek: "Jueves", order: 1 },
  { name: "Press inclinado con mancuernas", muscleGroup: "Pecho", sets: 3, reps: "12 reps", dayOfWeek: "Jueves", order: 2 },
  { name: "Fondos en paralelas", muscleGroup: "Pecho/Tríceps", sets: 3, reps: "12 reps", dayOfWeek: "Jueves", order: 3 },
  { name: "Aperturas con mancuernas", muscleGroup: "Pecho", sets: 3, reps: "15 reps", dayOfWeek: "Jueves", order: 4 },
  { name: "Press de hombros", muscleGroup: "Hombros", sets: 3, reps: "12 reps", dayOfWeek: "Jueves", order: 5 },
  // Viernes: Tren superior tirón
  { name: "Dominadas", muscleGroup: "Espalda", sets: 4, reps: "8 reps", dayOfWeek: "Viernes", order: 1 },
  { name: "Remo con barra", muscleGroup: "Espalda", sets: 3, reps: "12 reps", dayOfWeek: "Viernes", order: 2 },
  { name: "Jalón al pecho", muscleGroup: "Espalda", sets: 3, reps: "12 reps", dayOfWeek: "Viernes", order: 3 },
  { name: "Curl de bíceps", muscleGroup: "Bíceps", sets: 3, reps: "12 reps", dayOfWeek: "Viernes", order: 4 },
  { name: "Curl martillo", muscleGroup: "Bíceps", sets: 3, reps: "12 reps", dayOfWeek: "Viernes", order: 5 },
  // Sábado: Full body
  { name: "Sentadillas goblet", muscleGroup: "Full body", sets: 3, reps: "15 reps", dayOfWeek: "Sábado", order: 1 },
  { name: "Flexiones", muscleGroup: "Pecho", sets: 3, reps: "15 reps", dayOfWeek: "Sábado", order: 2 },
  { name: "Remo con mancuerna", muscleGroup: "Espalda", sets: 3, reps: "12 reps", dayOfWeek: "Sábado", order: 3 },
  { name: "Peso muerto rumano", muscleGroup: "Piernas", sets: 3, reps: "12 reps", dayOfWeek: "Sábado", order: 4 },
  { name: "Plancha lateral", muscleGroup: "Core", sets: 2, reps: "30 seg", dayOfWeek: "Sábado", order: 5 },
];

const ROUTINE_NAMES: Record<string, string> = {
  Martes: "Cardio + Core",
  Miércoles: "Tren inferior",
  Jueves: "Tren superior empuje",
  Viernes: "Tren superior tirón",
  Sábado: "Full body",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const {
      name,
      birthDate,
      sex,
      heightCm,
      currentWeightKg,
      weightGoalKg,
      activityLevel,
      trainDays,
      trainTime,
    } = parsed.data;

    const userId = parseInt(session.user.id);

    // Update user profile
    const updateData: Record<string, unknown> = {
      birthDate: new Date(birthDate),
      sex,
      heightCm,
      weightGoalKg,
      activityLevel,
      trainDays,
      trainTime,
      onboardingDone: true,
    };

    if (name) {
      updateData.name = name;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Save initial weight log
    await prisma.weightLog.create({
      data: {
        userId,
        weightKg: currentWeightKg,
      },
    });

    // Seed default exercises
    await prisma.exercise.createMany({
      data: DEFAULT_EXERCISES.map((ex) => ({ ...ex, userId })),
    });

    // Create training sessions for the next 30 days based on trainDays
    const trainDaysList = trainDays.split(",").filter(Boolean);
    const DAY_MAP: Record<string, number> = {
      Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6, Domingo: 0,
    };

    const sessionsToCreate = [];
    for (let i = 0; i <= 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][date.getDay()];
      if (trainDaysList.includes(dayName)) {
        sessionsToCreate.push({
          userId,
          date,
          routineName: ROUTINE_NAMES[dayName] || dayName,
          completed: false,
        });
      }
    }

    if (sessionsToCreate.length > 0) {
      await prisma.trainingSession.createMany({ data: sessionsToCreate });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
