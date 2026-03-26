import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface NotifSchedule {
  enabled: boolean;
  time: string;       // "HH:MM"
  mode: "train" | "all" | "custom";
  customDays: string[]; // used when mode="custom"
}

export interface NotificationConfig {
  preWorkout: NotifSchedule;
  nutritionReminder: NotifSchedule;
  weightReminder: NotifSchedule;
  missedSession: NotifSchedule;
}

export const DEFAULT_NOTIF_CONFIG: NotificationConfig = {
  preWorkout:        { enabled: true, time: "06:30", mode: "train",  customDays: [] },
  nutritionReminder: { enabled: true, time: "13:00", mode: "all",    customDays: [] },
  weightReminder:    { enabled: true, time: "08:00", mode: "all",    customDays: [] },
  missedSession:     { enabled: true, time: "20:00", mode: "train",  customDays: [] },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramBotToken: true, telegramChatId: true, notificationConfig: true },
    });

    const notifConfig = (user?.notificationConfig as unknown as NotificationConfig) || DEFAULT_NOTIF_CONFIG;

    return NextResponse.json({
      config: {
        telegramBotToken: user?.telegramBotToken || "",
        telegramChatId: user?.telegramChatId || "",
        ...notifConfig,
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
    const userId = parseInt(session.user.id);

    const notifConfig: NotificationConfig = {
      preWorkout:        body.preWorkout        || DEFAULT_NOTIF_CONFIG.preWorkout,
      nutritionReminder: body.nutritionReminder || DEFAULT_NOTIF_CONFIG.nutritionReminder,
      weightReminder:    body.weightReminder    || DEFAULT_NOTIF_CONFIG.weightReminder,
      missedSession:     body.missedSession     || DEFAULT_NOTIF_CONFIG.missedSession,
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramBotToken: body.telegramBotToken || null,
        telegramChatId: body.telegramChatId || null,
        notificationConfig: notifConfig as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications config PUT error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
