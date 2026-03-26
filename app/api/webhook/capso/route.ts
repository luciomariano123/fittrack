import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  weightLoggedMessage,
  sessionCompletedMessage,
} from "@/lib/message-templates";
import { sendWhatsAppMessage } from "@/lib/capso";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Capso webhook payload structure
    const { from, message: rawMessage } = body;

    if (!from || !rawMessage) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const message = rawMessage.trim().toLowerCase();

    // Find user by WhatsApp number
    const user = await prisma.user.findFirst({
      where: { whatsappNumber: from },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    let responseMessage = "";

    // Parse "peso X.X" command
    if (message.startsWith("peso ")) {
      const weightStr = message.replace("peso ", "").trim();
      const weightKg = parseFloat(weightStr);

      if (!isNaN(weightKg) && weightKg >= 30 && weightKg <= 300) {
        await prisma.weightLog.create({
          data: { userId: user.id, weightKg },
        });

        responseMessage = weightLoggedMessage(
          user.name.split(" ")[0],
          weightKg
        );

        await prisma.notificationLog.create({
          data: {
            userId: user.id,
            type: "weight_log_via_whatsapp",
            message: `Peso ${weightKg}kg registrado vía WhatsApp`,
            status: "received",
          },
        });
      } else {
        responseMessage = `❌ Peso inválido. Enviá algo como: *peso 78.5*`;
      }
    }

    // Parse "listo" command — complete today's session
    else if (message === "listo" || message === "listo!" || message === "terminé") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySession = await prisma.trainingSession.findFirst({
        where: {
          userId: user.id,
          date: { gte: today, lt: tomorrow },
          completed: false,
        },
      });

      if (todaySession) {
        await prisma.trainingSession.update({
          where: { id: todaySession.id },
          data: { completed: true, completedAt: new Date() },
        });

        responseMessage = sessionCompletedMessage(
          user.name.split(" ")[0],
          todaySession.routineName
        );

        await prisma.notificationLog.create({
          data: {
            userId: user.id,
            type: "session_completed_via_whatsapp",
            message: `Sesión ${todaySession.routineName} completada vía WhatsApp`,
            status: "received",
          },
        });
      } else {
        responseMessage = `ℹ️ No encontré ninguna sesión pendiente para hoy.`;
      }
    }

    // Unknown command
    else {
      responseMessage = `🤖 *FitTrack Bot*\n\nComandos disponibles:\n• *peso X.X* — Registrar peso (ej: peso 78.5)\n• *listo* — Marcar sesión de hoy como completada`;
    }

    // Send response via Capso
    if (responseMessage && user.capsoApiKey) {
      await sendWhatsAppMessage(from, responseMessage, user.capsoApiKey);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
