import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const sessionSchema = z.object({
  date: z.string(),
  routineName: z.string(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const sessions = await prisma.trainingSession.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 90,
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date.toISOString(),
        routineName: s.routineName,
        completed: s.completed,
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("Sessions GET error:", error);
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
    const parsed = sessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    const trainingSession = await prisma.trainingSession.create({
      data: {
        userId,
        date: new Date(parsed.data.date),
        routineName: parsed.data.routineName,
      },
    });

    return NextResponse.json({
      session: {
        id: trainingSession.id,
        date: trainingSession.date.toISOString(),
        routineName: trainingSession.routineName,
        completed: trainingSession.completed,
      },
    });
  } catch (error) {
    console.error("Sessions POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
