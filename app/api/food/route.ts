import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const foodLogSchema = z.object({
  meal: z.string(),
  foodName: z.string(),
  grams: z.number().positive(),
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const startParam = req.nextUrl.searchParams.get("start");
    const endParam = req.nextUrl.searchParams.get("end");
    // Client sends UTC boundaries for the local day
    const todayStart = startParam ? new Date(startParam) : (() => { const d = new Date(); d.setUTCHours(0,0,0,0); return d; })();
    const todayEnd = endParam ? new Date(endParam) : (() => { const d = new Date(); d.setUTCHours(23,59,59,999); return d; })();

    const foodLogs = await prisma.foodLog.findMany({
      where: {
        userId,
        loggedAt: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { loggedAt: "asc" },
    });

    return NextResponse.json({
      foodLogs: foodLogs.map((f) => ({
        id: f.id,
        meal: f.meal,
        foodName: f.foodName,
        grams: f.grams,
        kcal: f.kcal,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        loggedAt: f.loggedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Food GET error:", error);
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
    const parsed = foodLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    const foodLog = await prisma.foodLog.create({
      data: {
        userId,
        ...parsed.data,
      },
    });

    return NextResponse.json({
      foodLog: {
        id: foodLog.id,
        ...parsed.data,
        loggedAt: foodLog.loggedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Food POST error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
