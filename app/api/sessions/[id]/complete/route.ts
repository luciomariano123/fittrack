import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/capso";
import { postWorkoutMessage } from "@/lib/message-templates";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const sessionId = parseInt(params.id);

    const trainingSession = await prisma.trainingSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!trainingSession) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const completedAt = new Date();

    await prisma.trainingSession.update({
      where: { id: sessionId },
      data: { completed: true, completedAt },
    });

    // Send WhatsApp post-workout message if configured
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        whatsappNumber: true,
        capsoApiKey: true,
      },
    });

    if (user?.whatsappNumber && user?.capsoApiKey) {
      const durationMs = completedAt.getTime() - new Date(trainingSession.date).getTime();
      const durationMin = Math.round(durationMs / 60000) || 60;

      const message = postWorkoutMessage({
        name: user.name.split(" ")[0],
        routineName: trainingSession.routineName,
        duration: durationMin,
      });

      const result = await sendWhatsAppMessage(
        user.whatsappNumber,
        message,
        user.capsoApiKey
      );

      await prisma.notificationLog.create({
        data: {
          userId,
          type: "post_workout",
          message,
          status: result.success ? "sent" : "error",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Complete session error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
