import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectWeightData } from "@/lib/calculations";
import { z } from "zod";

const weightSchema = z.object({
  weightKg: z.number().min(30).max(300),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const [weightLogs, user] = await Promise.all([
      prisma.weightLog.findMany({
        where: { userId },
        orderBy: { loggedAt: "asc" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { weightGoalKg: true },
      }),
    ]);

    const projections = projectWeightData(weightLogs, 30);

    return NextResponse.json({
      weightLogs: weightLogs.map((w) => ({
        id: w.id,
        weightKg: w.weightKg,
        loggedAt: w.loggedAt.toISOString(),
      })),
      weightGoalKg: user?.weightGoalKg,
      projections,
    });
  } catch (error) {
    console.error("Weight GET error:", error);
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
    const parsed = weightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    const log = await prisma.weightLog.create({
      data: {
        userId,
        weightKg: parsed.data.weightKg,
      },
    });

    return NextResponse.json({
      weightLog: {
        id: log.id,
        weightKg: log.weightKg,
        loggedAt: log.loggedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Weight POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
