import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, createInlineKeyboard } from "@/lib/telegram";
import {
  preWorkoutMessage,
  nutritionReminderMessage,
  weightReminderMessage,
  missedSessionMessage,
} from "@/lib/message-templates";
import {
  calculateBMR,
  calculateTDEE,
  calculateTargetCalories,
  calculateAge,
} from "@/lib/calculations";

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function getTodayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

async function getUsersForToday() {
  const todayName = getTodayName();

  const users = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      telegramBotToken: { not: null },
      onboardingDone: true,
      trainDays: { contains: todayName },
    },
  });

  return users.filter((u) => u.telegramChatId && u.telegramBotToken) as (typeof users[0] & {
    telegramChatId: string;
    telegramBotToken: string;
  })[];
}

async function getAllActiveUsers() {
  const users = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      telegramBotToken: { not: null },
      onboardingDone: true,
    },
  });

  return users.filter((u) => u.telegramChatId && u.telegramBotToken) as (typeof users[0] & {
    telegramChatId: string;
    telegramBotToken: string;
  })[];
}

async function logNotification(
  userId: number,
  type: string,
  message: string,
  status: string
) {
  await prisma.notificationLog.create({
    data: { userId, type, message, status },
  });
}

// 6:30 AM on gym days: pre-workout message with inline keyboard
cron.schedule("30 6 * * *", async () => {
  console.log("[CRON] Running pre-workout notifications...");
  try {
    const users = await getUsersForToday();

    for (const user of users) {
      const todayName = getTodayName();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaySession = await prisma.trainingSession.findFirst({
        where: {
          userId: user.id,
          date: { gte: today, lt: tomorrow },
        },
      });

      const message = preWorkoutMessage({
        name: user.name.split(" ")[0],
        routineName: todaySession?.routineName || todayName,
        time: user.trainTime === "morning" ? "la mañana" : "la noche",
      });

      const keyboard = createInlineKeyboard([
        [{ text: "✅ Marcar como completado", callback_data: "complete_session" }],
        [{ text: "📊 Ver estado", callback_data: "get_status" }],
      ]);

      const result = await sendTelegramMessage(
        user.telegramChatId,
        message,
        user.telegramBotToken,
        keyboard
      );

      await logNotification(
        user.id,
        "pre_workout",
        message,
        result.ok ? "sent" : "error"
      );
    }
  } catch (error) {
    console.error("[CRON] Pre-workout error:", error);
  }
});

// 8:00 AM daily: weight reminder
cron.schedule("0 8 * * *", async () => {
  console.log("[CRON] Running weight reminder notifications...");
  try {
    const users = await getAllActiveUsers();

    for (const user of users) {
      const lastLog = await prisma.weightLog.findFirst({
        where: { userId: user.id },
        orderBy: { loggedAt: "desc" },
      });

      const message = weightReminderMessage({
        name: user.name.split(" ")[0],
        lastWeight: lastLog?.weightKg,
        lastWeightDate: lastLog
          ? new Date(lastLog.loggedAt).toLocaleDateString("es-AR")
          : undefined,
      });

      const result = await sendTelegramMessage(
        user.telegramChatId,
        message,
        user.telegramBotToken
      );

      await logNotification(
        user.id,
        "weight_reminder",
        message,
        result.ok ? "sent" : "error"
      );
    }
  } catch (error) {
    console.error("[CRON] Weight reminder error:", error);
  }
});

// 13:00 daily: nutrition reminder
cron.schedule("0 13 * * *", async () => {
  console.log("[CRON] Running nutrition reminder notifications...");
  try {
    const users = await getAllActiveUsers();

    for (const user of users) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayFoods = await prisma.foodLog.findMany({
        where: {
          userId: user.id,
          loggedAt: { gte: todayStart, lte: todayEnd },
        },
      });

      const consumedCalories = todayFoods.reduce(
        (acc, f) => acc + f.kcal,
        0
      );

      const latestWeight = await prisma.weightLog.findFirst({
        where: { userId: user.id },
        orderBy: { loggedAt: "desc" },
      });

      const age = calculateAge(new Date(user.birthDate));
      const bmr = latestWeight
        ? calculateBMR(latestWeight.weightKg, user.heightCm, age, user.sex)
        : 2000;
      const tdee = calculateTDEE(bmr, user.activityLevel);
      const targetCalories = calculateTargetCalories(tdee);
      const proteinTarget = latestWeight
        ? Math.round(1.8 * latestWeight.weightKg)
        : 150;

      const message = nutritionReminderMessage({
        name: user.name.split(" ")[0],
        targetCalories,
        proteinTarget,
        consumedCalories: Math.round(consumedCalories),
      });

      const result = await sendTelegramMessage(
        user.telegramChatId,
        message,
        user.telegramBotToken
      );

      await logNotification(
        user.id,
        "nutrition_reminder",
        message,
        result.ok ? "sent" : "error"
      );
    }
  } catch (error) {
    console.error("[CRON] Nutrition reminder error:", error);
  }
});

// 20:00 on gym days: missed session alert
cron.schedule("0 20 * * *", async () => {
  console.log("[CRON] Running missed session notifications...");
  try {
    const users = await getUsersForToday();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const user of users) {
      const todaySession = await prisma.trainingSession.findFirst({
        where: {
          userId: user.id,
          date: { gte: today, lt: tomorrow },
          completed: false,
        },
      });

      if (!todaySession) continue; // Already completed or no session

      const message = missedSessionMessage({
        name: user.name.split(" ")[0],
        routineName: todaySession.routineName,
      });

      const result = await sendTelegramMessage(
        user.telegramChatId,
        message,
        user.telegramBotToken
      );

      await logNotification(
        user.id,
        "missed_session",
        message,
        result.ok ? "sent" : "error"
      );
    }
  } catch (error) {
    console.error("[CRON] Missed session error:", error);
  }
});

console.log("[CRON] Notification scheduler initialized");
