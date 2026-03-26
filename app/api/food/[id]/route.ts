import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const logId = parseInt(params.id);

    const log = await prisma.foodLog.findFirst({
      where: { id: logId, userId },
    });

    if (!log) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    await prisma.foodLog.delete({ where: { id: logId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Food DELETE error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
