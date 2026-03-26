import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_EXERCISES = [
  // LUNES — Pecho + Tríceps + Cardio
  { dayOfWeek: "Lunes", name: "Press banca", muscleGroup: "Pecho", sets: 4, reps: "10", order: 1 },
  { dayOfWeek: "Lunes", name: "Máquina press de pecho plano", muscleGroup: "Pecho", sets: 3, reps: "12", order: 2 },
  { dayOfWeek: "Lunes", name: "Apertura de mancuernas", muscleGroup: "Pecho", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Lunes", name: "Tríceps barra", muscleGroup: "Tríceps", sets: 3, reps: "12", order: 4 },
  { dayOfWeek: "Lunes", name: "Tríceps soga en polea", muscleGroup: "Tríceps", sets: 3, reps: "12", order: 5 },
  { dayOfWeek: "Lunes", name: "HIIT: correr 1 min rápido / 2 min trote", muscleGroup: "Cardio", sets: 1, reps: "15-20 min", order: 6 },

  // MARTES — Espalda + Bíceps + Cardio
  { dayOfWeek: "Martes", name: "Jalón al pecho agarre ancho", muscleGroup: "Espalda", sets: 4, reps: "10", order: 1 },
  { dayOfWeek: "Martes", name: "Jalón al pecho agarre cerrado", muscleGroup: "Espalda", sets: 3, reps: "12", order: 2 },
  { dayOfWeek: "Martes", name: "Curl bíceps con mancuernas", muscleGroup: "Bíceps", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Martes", name: "Curl martillo", muscleGroup: "Bíceps", sets: 3, reps: "12", order: 4 },
  { dayOfWeek: "Martes", name: "Cardio: correr ritmo medio", muscleGroup: "Cardio", sets: 1, reps: "20-30 min", order: 5 },

  // MIÉRCOLES — Piernas + Glúteos + Cardio
  { dayOfWeek: "Miércoles", name: "Prensa de piernas", muscleGroup: "Piernas", sets: 4, reps: "12", order: 1 },
  { dayOfWeek: "Miércoles", name: "Camilla cuádriceps", muscleGroup: "Piernas", sets: 3, reps: "12", order: 2 },
  { dayOfWeek: "Miércoles", name: "Camilla isquiotibiales", muscleGroup: "Piernas", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Miércoles", name: "Estocadas con mancuernas", muscleGroup: "Piernas", sets: 3, reps: "10 c/pierna", order: 4 },
  { dayOfWeek: "Miércoles", name: "Patada de glúteos en máquina/cable", muscleGroup: "Glúteos", sets: 3, reps: "15", order: 5 },
  { dayOfWeek: "Miércoles", name: "Caminata en cinta inclinada", muscleGroup: "Cardio", sets: 1, reps: "20 min", order: 6 },

  // JUEVES — Pecho + Hombros + Tríceps + Cardio
  { dayOfWeek: "Jueves", name: "Press pecho con mancuernas", muscleGroup: "Pecho", sets: 4, reps: "10", order: 1 },
  { dayOfWeek: "Jueves", name: "Máquina press plano", muscleGroup: "Pecho", sets: 3, reps: "12", order: 2 },
  { dayOfWeek: "Jueves", name: "Apertura de mancuernas", muscleGroup: "Pecho", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Jueves", name: "Tríceps barra", muscleGroup: "Tríceps", sets: 3, reps: "12", order: 4 },
  { dayOfWeek: "Jueves", name: "Tríceps soga en polea", muscleGroup: "Tríceps", sets: 3, reps: "12", order: 5 },
  { dayOfWeek: "Jueves", name: "HIIT: correr intervalos", muscleGroup: "Cardio", sets: 1, reps: "15 min", order: 6 },

  // VIERNES — Piernas + Espalda + Bíceps + Cardio
  { dayOfWeek: "Viernes", name: "Prensa de piernas", muscleGroup: "Piernas", sets: 4, reps: "12", order: 1 },
  { dayOfWeek: "Viernes", name: "Camilla cuádriceps", muscleGroup: "Piernas", sets: 3, reps: "12", order: 2 },
  { dayOfWeek: "Viernes", name: "Jalón al pecho agarre ancho", muscleGroup: "Espalda", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Viernes", name: "Curl bíceps con mancuernas", muscleGroup: "Bíceps", sets: 3, reps: "12", order: 4 },
  { dayOfWeek: "Viernes", name: "Cardio: correr ritmo medio", muscleGroup: "Cardio", sets: 1, reps: "25-30 min", order: 5 },

  // SÁBADO — Cardio zona 2
  { dayOfWeek: "Sábado", name: "Cardio zona 2: correr o cinta a ritmo conversacional", muscleGroup: "Cardio", sets: 1, reps: "40-45 min", order: 1 },
];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await req.json().catch(() => ({}));
    const replace = body.replace !== false; // default: replace existing

    if (replace) {
      await prisma.exercise.deleteMany({ where: { userId } });
    }

    const created = await prisma.exercise.createMany({
      data: DEFAULT_EXERCISES.map((ex) => ({ ...ex, userId })),
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (error) {
    console.error("Exercises bulk POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
