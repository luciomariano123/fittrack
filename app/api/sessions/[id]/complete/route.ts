import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { postWorkoutMessage } from "@/lib/message-templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const sessionId = parseInt(id);

    // Parse optional body fields
    let mood: string | undefined;
    let notes: string | undefined;
    let duration: number | undefined;

    try {
      const body = await req.json();
      mood = body.mood;
      notes = body.notes;
      duration = body.duration ? parseInt(body.duration) : undefined;
    } catch {
      // Body is optional — ignore parse errors
    }

    const trainingSession = await prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!trainingSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const completedAt = new Date();

    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: {
        completed: true,
        completedAt,
        mood: mood || null,
        notes: notes || null,
        duration: duration || null,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        telegramBotToken: true,
        telegramChatId: true,
      },
    });

    if (user?.telegramBotToken && user?.telegramChatId) {
      const durationMin = duration || Math.round((completedAt.getTime() - new Date(trainingSession.date).getTime()) / 60000) || 60;

      const message = postWorkoutMessage({
        name: user.name.split(" ")[0],
        routineName: trainingSession.routineName,
        duration: durationMin,
      });

      const result = await sendTelegramMessage(
        user.telegramChatId,
        message,
        user.telegramBotToken
      );

      await prisma.notificationLog.create({
        data: {
          userId,
          type: "post_workout",
          message,
          status: result.ok ? "sent" : "error",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete session error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
