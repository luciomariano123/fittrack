import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        heightCm: true,
        weightGoalKg: true,
        activityLevel: true,
        trainDays: true,
        trainTime: true,
        birthDate: true,
        sex: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  heightCm: z.number().min(100).max(250).optional(),
  weightGoalKg: z.number().min(30).max(300).optional(),
  activityLevel: z.string().optional(),
  trainDays: z.string().optional(),
  trainTime: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
