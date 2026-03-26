import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage, createInlineKeyboard } from '@/lib/telegram';
import {
  weightLoggedMessage,
  sessionCompletedMessage,
} from '@/lib/message-templates';
import {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateAge,
} from '@/lib/calculations';

// Rate limiting: max 10 messages per minute per chat_id
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(chatId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(chatId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(chatId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 10) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Verify secret token header
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedToken && secretToken !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Handle callback_query (inline button press)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const chatId = String(callbackQuery.message?.chat?.id);
      const data = callbackQuery.data as string;

      if (!checkRateLimit(chatId)) {
        return NextResponse.json({ ok: true });
      }

      const user = await prisma.user.findFirst({
        where: { telegramChatId: chatId },
      });

      if (!user || !user.telegramBotToken) {
        return NextResponse.json({ ok: true });
      }

      if (data === 'complete_session') {
        await handleListoCommand(user, chatId, user.telegramBotToken);
      } else if (data === 'get_status') {
        await handleEstadoCommand(user, chatId, user.telegramBotToken);
      }

      return NextResponse.json({ ok: true });
    }

    // Handle regular message
    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const chatId = String(message.chat?.id);
    const text = (message.text || '').trim();

    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    if (!checkRateLimit(chatId)) {
      return NextResponse.json({ ok: true });
    }

    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
    });

    if (!user || !user.telegramBotToken) {
      return NextResponse.json({ ok: true });
    }

    const botToken = user.telegramBotToken;
    const lowerText = text.toLowerCase();

    // /peso 91.2 or peso 91.2
    if (lowerText.startsWith('/peso ') || lowerText.startsWith('peso ')) {
      const weightStr = lowerText.replace(/^\/?peso\s+/, '').trim();
      const weightKg = parseFloat(weightStr);

      if (!isNaN(weightKg) && weightKg >= 30 && weightKg <= 300) {
        await prisma.weightLog.create({
          data: { userId: user.id, weightKg },
        });

        await prisma.notificationLog.create({
          data: {
            userId: user.id,
            type: 'weight_log_via_telegram',
            message: `Peso ${weightKg}kg registrado vía Telegram`,
            status: 'received',
          },
        });

        const responseMessage = weightLoggedMessage(user.name.split(' ')[0], weightKg);
        await sendTelegramMessage(chatId, responseMessage, botToken);
      } else {
        await sendTelegramMessage(
          chatId,
          `❌ Peso inválido\\. Enviá algo como: *peso 78\\.5*`,
          botToken
        );
      }
    }

    // /listo or listo — complete today's session
    else if (lowerText === '/listo' || lowerText === 'listo' || lowerText === 'listo!' || lowerText === 'terminé') {
      await handleListoCommand(user, chatId, botToken);
    }

    // /estado — today's summary
    else if (lowerText === '/estado' || lowerText === 'estado') {
      await handleEstadoCommand(user, chatId, botToken);
    }

    // /rutina — today's exercises
    else if (lowerText === '/rutina' || lowerText === 'rutina') {
      await handleRutinaCommand(user, chatId, botToken);
    }

    // Unknown command
    else {
      const helpMessage = `🤖 *FitTrack Bot*\n\nComandos disponibles:\n• *peso X\\.X* — Registrar peso \\(ej: peso 78\\.5\\)\n• *listo* — Marcar sesión de hoy como completada\n• *estado* — Ver resumen de hoy\n• *rutina* — Ver ejercicios de hoy`;
      await sendTelegramMessage(chatId, helpMessage, botToken);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function handleListoCommand(
  user: { id: number; name: string; telegramBotToken: string | null },
  chatId: string,
  botToken: string
) {
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

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        type: 'session_completed_via_telegram',
        message: `Sesión ${todaySession.routineName} completada vía Telegram`,
        status: 'received',
      },
    });

    const responseMessage = sessionCompletedMessage(
      user.name.split(' ')[0],
      todaySession.routineName
    );
    await sendTelegramMessage(chatId, responseMessage, botToken);
  } else {
    await sendTelegramMessage(
      chatId,
      `ℹ️ No encontré ninguna sesión pendiente para hoy\\.`,
      botToken
    );
  }
}

async function handleEstadoCommand(
  user: { id: number; name: string; activityLevel: string; heightCm: number; sex: string; birthDate: Date },
  chatId: string,
  botToken: string
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayFoods, latestWeight, todaySession] = await Promise.all([
    prisma.foodLog.findMany({
      where: { userId: user.id, loggedAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.weightLog.findFirst({
      where: { userId: user.id },
      orderBy: { loggedAt: 'desc' },
    }),
    prisma.trainingSession.findFirst({
      where: { userId: user.id, date: { gte: todayStart, lt: todayEnd } },
    }),
  ]);

  const consumedCalories = Math.round(
    todayFoods.reduce((acc, f) => acc + f.kcal, 0)
  );

  const age = calculateAge(new Date(user.birthDate));
  const bmr = latestWeight
    ? calculateBMR(latestWeight.weightKg, user.heightCm, age, user.sex)
    : 2000;
  const tdee = calculateTDEE(bmr, user.activityLevel);
  const targetCalories = calculateTargetCalories(tdee);

  const sessionStatus = todaySession?.completed
    ? '✅ Completada'
    : todaySession
    ? '⏳ Pendiente'
    : '😴 Sin sesión hoy';

  const weightStr = latestWeight
    ? `${latestWeight.weightKg} kg`
    : 'No registrado';

  const statusMessage = `📊 *Resumen de hoy — ${user.name.split(' ')[0]}*\n\n⚖️ Peso: *${weightStr}*\n🔥 Calorías: *${consumedCalories} / ${targetCalories} kcal*\n💪 Entrenamiento: ${sessionStatus}`;

  await sendTelegramMessage(chatId, statusMessage, botToken);
}

async function handleRutinaCommand(
  user: { id: number; name: string },
  chatId: string,
  botToken: string
) {
  const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayName = DAY_NAMES[new Date().getDay()];

  const exercises = await prisma.exercise.findMany({
    where: { userId: user.id, dayOfWeek: todayName },
    orderBy: { order: 'asc' },
  });

  if (exercises.length === 0) {
    await sendTelegramMessage(
      chatId,
      `😴 Hoy \\(${todayName}\\) es día de descanso\\.`,
      botToken
    );
    return;
  }

  const exerciseList = exercises
    .map(
      (ex) =>
        `• *${ex.name}* — ${ex.sets} series × ${ex.reps}${ex.weightKg ? ` \\(${ex.weightKg} kg\\)` : ''}`
    )
    .join('\n');

  const keyboard = createInlineKeyboard([
    [{ text: '✅ Marcar como completado', callback_data: 'complete_session' }],
    [{ text: '📊 Ver estado', callback_data: 'get_status' }],
  ]);

  const rutinaMessage = `💪 *Rutina de hoy — ${todayName}*\n\n${exerciseList}\n\n¡Dale con todo, che\\!`;
  await sendTelegramMessage(chatId, rutinaMessage, botToken, keyboard);
}
