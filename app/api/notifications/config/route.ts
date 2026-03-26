import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const configSchema = z.object({
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  preWorkout: z.boolean().optional(),
  nutritionReminder: z.boolean().optional(),
  weightReminder: z.boolean().optional(),
  missedSession: z.boolean().optional(),
});

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
        telegramBotToken: true,
        telegramChatId: true,
      },
    });

    return NextResponse.json({
      config: {
        telegramBotToken: user?.telegramBotToken || "",
        telegramChatId: user?.telegramChatId || "",
        preWorkout: true,
        nutritionReminder: true,
        weightReminder: true,
        missedSession: true,
      },
    });
  } catch (error) {
    console.error("Notifications config GET error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = configSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramBotToken: parsed.data.telegramBotToken || null,
        telegramChatId: parsed.data.telegramChatId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications config PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
