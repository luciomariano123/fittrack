import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  muscleGroup: z.string().optional(),
  sets: z.number().int().positive().optional(),
  reps: z.string().optional(),
  weightKg: z.number().optional().nullable(),
  dayOfWeek: z.string().optional(),
  order: z.number().int().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const exerciseId = parseInt(params.id);

    const existing = await prisma.exercise.findFirst({
      where: { id: exerciseId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const exercise = await prisma.exercise.update({
      where: { id: exerciseId },
      data: parsed.data,
    });

    return NextResponse.json({ exercise });
  } catch (error) {
    console.error("Exercise PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const exerciseId = parseInt(params.id);

    const existing = await prisma.exercise.findFirst({
      where: { id: exerciseId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
    }

    await prisma.exercise.delete({ where: { id: exerciseId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Exercise DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
