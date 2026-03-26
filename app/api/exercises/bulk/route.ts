import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_EXERCISES = [
  // LUNES — Descanso activo
  { dayOfWeek: "Lunes", name: "Cardio: trote suave o caminata", muscleGroup: "Cardio", sets: 1, reps: "30 min", order: 1 },

  // MARTES — Pecho + Tríceps
  { dayOfWeek: "Martes", name: "Press banca plano", muscleGroup: "Pecho", sets: 4, reps: "10", order: 1 },
  { dayOfWeek: "Martes", name: "Press inclinado con mancuernas", muscleGroup: "Pecho", sets: 3, reps: "12", order: 2 },
  { dayOfWeek: "Martes", name: "Máquina press de pecho", muscleGroup: "Pecho", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Martes", name: "Aperturas con mancuernas", muscleGroup: "Pecho", sets: 3, reps: "12", order: 4 },
  { dayOfWeek: "Martes", name: "Tríceps barra (francés o polea)", muscleGroup: "Tríceps", sets: 3, reps: "12", order: 5 },
  { dayOfWeek: "Martes", name: "Tríceps soga en polea", muscleGroup: "Tríceps", sets: 3, reps: "15", order: 6 },
  { dayOfWeek: "Martes", name: "HIIT: 1 min rápido / 2 min trote", muscleGroup: "Cardio", sets: 5, reps: "3 min", order: 7 },

  // MIÉRCOLES — Piernas + Core
  { dayOfWeek: "Miércoles", name: "Prensa de piernas", muscleGroup: "Piernas", sets: 4, reps: "12", order: 1 },
  { dayOfWeek: "Miércoles", name: "Camilla cuádriceps", muscleGroup: "Piernas", sets: 3, reps: "12", order: 2 },
  { dayOfWeek: "Miércoles", name: "Camilla isquiotibiales", muscleGroup: "Piernas", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Miércoles", name: "Estocadas con mancuernas", muscleGroup: "Piernas", sets: 3, reps: "10 c/lado", order: 4 },
  { dayOfWeek: "Miércoles", name: "Patada de glúteos en máquina/cable", muscleGroup: "Glúteos", sets: 3, reps: "15", order: 5 },
  { dayOfWeek: "Miércoles", name: "Plancha abdominal", muscleGroup: "Core", sets: 3, reps: "45 seg", order: 6 },
  { dayOfWeek: "Miércoles", name: "Russian twists con peso", muscleGroup: "Core", sets: 3, reps: "20", order: 7 },
  { dayOfWeek: "Miércoles", name: "Caminata en cinta inclinada (8-12%)", muscleGroup: "Cardio", sets: 1, reps: "20 min", order: 8 },

  // JUEVES — Hombros + Espalda + Bíceps
  { dayOfWeek: "Jueves", name: "Jalón al pecho agarre ancho", muscleGroup: "Espalda", sets: 4, reps: "10", order: 1 },
  { dayOfWeek: "Jueves", name: "Remo con mancuerna unilateral", muscleGroup: "Espalda", sets: 3, reps: "12 c/lado", order: 2 },
  { dayOfWeek: "Jueves", name: "Jalón al pecho agarre cerrado", muscleGroup: "Espalda", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Jueves", name: "Press de hombros con mancuernas", muscleGroup: "Hombros", sets: 4, reps: "10", order: 4 },
  { dayOfWeek: "Jueves", name: "Elevaciones laterales", muscleGroup: "Hombros", sets: 3, reps: "15", order: 5 },
  { dayOfWeek: "Jueves", name: "Elevaciones frontales", muscleGroup: "Hombros", sets: 3, reps: "12", order: 6 },
  { dayOfWeek: "Jueves", name: "Curl bíceps con mancuernas", muscleGroup: "Bíceps", sets: 3, reps: "12", order: 7 },
  { dayOfWeek: "Jueves", name: "Curl martillo", muscleGroup: "Bíceps", sets: 3, reps: "12", order: 8 },
  { dayOfWeek: "Jueves", name: "Cardio: bicicleta estática ritmo medio", muscleGroup: "Cardio", sets: 1, reps: "15 min", order: 9 },

  // VIERNES — Piernas + Core + Cardio
  { dayOfWeek: "Viernes", name: "Prensa de piernas", muscleGroup: "Piernas", sets: 4, reps: "12", order: 1 },
  { dayOfWeek: "Viernes", name: "Camilla cuádriceps", muscleGroup: "Piernas", sets: 3, reps: "15", order: 2 },
  { dayOfWeek: "Viernes", name: "Camilla isquiotibiales", muscleGroup: "Piernas", sets: 3, reps: "12", order: 3 },
  { dayOfWeek: "Viernes", name: "Sentadilla en máquina Smith", muscleGroup: "Piernas", sets: 3, reps: "12", order: 4 },
  { dayOfWeek: "Viernes", name: "Plancha lateral", muscleGroup: "Core", sets: 3, reps: "35 seg c/lado", order: 5 },
  { dayOfWeek: "Viernes", name: "Abdominales en máquina o crunch", muscleGroup: "Core", sets: 3, reps: "20", order: 6 },
  { dayOfWeek: "Viernes", name: "Cardio libre (bici, correr o cinta)", muscleGroup: "Cardio", sets: 1, reps: "25-30 min", order: 7 },

  // SÁBADO — Solo cardio
  { dayOfWeek: "Sábado", name: "Cardio zona 2 (correr, bici o cinta)", muscleGroup: "Cardio", sets: 1, reps: "40-45 min", order: 1 },
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
