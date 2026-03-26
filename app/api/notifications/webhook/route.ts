import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramBotToken: true },
    });

    if (!user?.telegramBotToken) {
      return NextResponse.json({ error: "Bot token no configurado" }, { status: 400 });
    }

    const { webhookUrl } = await req.json();
    if (!webhookUrl) {
      return NextResponse.json({ error: "webhookUrl requerida" }, { status: 400 });
    }

    const res = await fetch(
      `https://api.telegram.org/bot${user.telegramBotToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
        }),
      }
    );

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.description || "Error de Telegram" }, { status: 400 });
    }

    return NextResponse.json({ success: true, description: data.description });
  } catch (error) {
    console.error("Webhook setup error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
