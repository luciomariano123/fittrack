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

    // comi / /comi — log food
    else if (
      lowerText.startsWith('comi ') || lowerText.startsWith('/comi ') ||
      lowerText.startsWith('desayuné ') || lowerText.startsWith('almorcé ') ||
      lowerText.startsWith('cené ') || lowerText.startsWith('merendé ')
    ) {
      await handleComiCommand(user, chatId, botToken, text);
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
      const helpMessage = `🤖 *FitTrack Bot*\n\nComandos disponibles:\n• *comi \\[comida\\]* — Registrar lo que comiste \\(ej: comi cena pollo con arroz\\)\n• *peso X\\.X* — Registrar peso \\(ej: peso 78\\.5\\)\n• *listo* — Marcar sesión de hoy como completada\n• *estado* — Ver resumen de hoy\n• *rutina* — Ver ejercicios de hoy\n\n💡 También podés usar: *desayuné*, *almorcé*, *cené*, *merendé*`;
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

async function handleComiCommand(
  user: { id: number; name: string; timezone: string },
  chatId: string,
  botToken: string,
  rawText: string
) {
  const MEAL_KEYWORDS: Record<string, string> = {
    desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda',
    cena: 'Cena', snack: 'Snacks', snacks: 'Snacks',
  };
  const MEAL_CONJUGATIONS: Record<string, string> = {
    'desayuné': 'Desayuno', 'almorcé': 'Almuerzo',
    'cené': 'Cena', 'merendé': 'Merienda',
  };
  const PORTION_KEYWORDS: Record<string, string> = {
    poco: 'poco', poca: 'poco', poquito: 'poco',
    normal: 'normal',
    bastante: 'bastante', mucho: 'bastante', mucha: 'bastante', harto: 'bastante',
  };
  const CALORIE_ESTIMATES: Record<string, Record<string, number>> = {
    Desayuno: { poco: 150, normal: 300, bastante: 500 },
    Almuerzo: { poco: 350, normal: 600, bastante: 900 },
    Merienda: { poco: 80,  normal: 200, bastante: 350 },
    Cena:     { poco: 300, normal: 550, bastante: 800 },
    Snacks:   { poco: 80,  normal: 180, bastante: 300 },
  };
  const PROTEIN_ESTIMATES: Record<string, Record<string, number>> = {
    Desayuno: { poco: 8,  normal: 15, bastante: 22 },
    Almuerzo: { poco: 20, normal: 35, bastante: 50 },
    Merienda: { poco: 3,  normal: 8,  bastante: 14 },
    Cena:     { poco: 18, normal: 30, bastante: 45 },
    Snacks:   { poco: 3,  normal: 7,  bastante: 12 },
  };

  const lowerText = rawText.toLowerCase().trim();
  let meal: string | null = null;
  let portion = 'normal';
  let description = rawText.trim();

  // Detect conjugated verbs (desayuné X, almorcé X, etc.)
  for (const [conj, mealName] of Object.entries(MEAL_CONJUGATIONS)) {
    if (lowerText.startsWith(conj + ' ')) {
      meal = mealName;
      description = rawText.slice(conj.length + 1).trim();
      break;
    }
  }

  if (!meal) {
    // Remove "comi " or "/comi " prefix
    const prefixLen = lowerText.startsWith('/comi ') ? 6 : 5;
    description = rawText.slice(prefixLen).trim();

    // Check if first word is a meal name
    const firstWord = description.split(' ')[0].toLowerCase();
    if (MEAL_KEYWORDS[firstWord]) {
      meal = MEAL_KEYWORDS[firstWord];
      description = description.slice(firstWord.length + 1).trim();
    }
  }

  // Check if next word is a portion indicator
  const firstDescWord = description.split(' ')[0].toLowerCase();
  if (PORTION_KEYWORDS[firstDescWord]) {
    portion = PORTION_KEYWORDS[firstDescWord];
    description = description.slice(firstDescWord.length + 1).trim();
  }

  // Auto-detect meal from user's local hour if not specified
  if (!meal) {
    const tz = user.timezone || 'America/Argentina/Buenos_Aires';
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(new Date());
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '12');
    if (hour < 11) meal = 'Desayuno';
    else if (hour < 15) meal = 'Almuerzo';
    else if (hour < 19) meal = 'Merienda';
    else if (hour < 23) meal = 'Cena';
    else meal = 'Snacks';
  }

  if (!description) {
    await sendTelegramMessage(chatId, `❌ Necesito saber qué comiste\\. Ej: *comi cena pollo con arroz*`, botToken);
    return;
  }

  const kcal = CALORIE_ESTIMATES[meal]?.[portion] ?? 400;
  const protein = PROTEIN_ESTIMATES[meal]?.[portion] ?? 20;
  const carbs = Math.round(kcal * 0.45 / 4);
  const fat = Math.round(kcal * 0.25 / 9);

  await prisma.foodLog.create({
    data: { userId: user.id, meal, foodName: description, grams: 0, kcal, protein, carbs, fat },
  });

  await prisma.notificationLog.create({
    data: {
      userId: user.id,
      type: 'food_log_via_telegram',
      message: `${meal}: ${description} (${kcal} kcal)`,
      status: 'received',
    },
  });

  const portionLabel = portion === 'poco' ? 'porción chica' : portion === 'bastante' ? 'porción grande' : 'porción normal';
  await sendTelegramMessage(
    chatId,
    `✅ *${meal} registrado*\n\n📝 ${description}\n🔥 ~${kcal} kcal · 💪 ~${protein}g proteína\n_\\(${portionLabel} — estimado\\)_`,
    botToken
  );
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
