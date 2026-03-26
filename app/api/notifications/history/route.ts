import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const notifications = await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        sentAt: n.sentAt.toISOString(),
        status: n.status,
      })),
    });
  } catch (error) {
    console.error("Notifications history error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
