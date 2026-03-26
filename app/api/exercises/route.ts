import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const exerciseSchema = z.object({
  name: z.string().min(1),
  muscleGroup: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.string(),
  weightKg: z.number().optional().nullable(),
  dayOfWeek: z.string(),
  order: z.number().int().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const exercises = await prisma.exercise.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: "asc" }, { order: "asc" }],
    });

    return NextResponse.json({ exercises });
  } catch (error) {
    console.error("Exercises GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = exerciseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    // Get current max order for that day
    const maxOrder = await prisma.exercise.findFirst({
      where: { userId, dayOfWeek: parsed.data.dayOfWeek },
      orderBy: { order: "desc" },
    });

    const exercise = await prisma.exercise.create({
      data: {
        userId,
        ...parsed.data,
        order: parsed.data.order ?? (maxOrder?.order ?? 0) + 1,
      },
    });

    return NextResponse.json({ exercise });
  } catch (error) {
    console.error("Exercises POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
