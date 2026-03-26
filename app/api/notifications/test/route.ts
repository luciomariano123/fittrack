import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
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
        telegramBotToken: true,
        telegramChatId: true,
      },
    });

    if (!user?.telegramBotToken || !user?.telegramChatId) {
      return NextResponse.json(
        { error: "Configurá tu Bot Token y Chat ID de Telegram primero" },
        { status: 400 }
      );
    }

    const message = `✅ *Mensaje de prueba — FitTrack*\n\n¡Hola ${user.name.split(" ")[0]}! Las notificaciones están configuradas correctamente. 💪`;

    const result = await sendTelegramMessage(
      user.telegramChatId,
      message,
      user.telegramBotToken
    );

    await prisma.notificationLog.create({
      data: {
        userId,
        type: "test",
        message,
        status: result.ok ? "sent" : "error",
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Error al enviar el mensaje de Telegram" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification test error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
