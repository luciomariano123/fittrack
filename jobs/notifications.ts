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
import type { NotifSchedule, NotificationConfig } from "@/app/api/notifications/config/route";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const DEFAULT_CONFIG: NotificationConfig = {
  preWorkout:        { enabled: true, time: "06:30", mode: "train",  customDays: [] },
  nutritionReminder: { enabled: true, time: "13:00", mode: "all",    customDays: [] },
  weightReminder:    { enabled: true, time: "08:00", mode: "all",    customDays: [] },
  missedSession:     { enabled: true, time: "20:00", mode: "train",  customDays: [] },
};

function isTodayIncluded(schedule: NotifSchedule, userTrainDays: string, todayName: string): boolean {
  if (schedule.mode === "all") return true;
  if (schedule.mode === "train") return userTrainDays.includes(todayName);
  if (schedule.mode === "custom") return schedule.customDays.includes(todayName);
  return false;
}

async function logNotification(userId: number, type: string, message: string, status: string) {
  await prisma.notificationLog.create({ data: { userId, type, message, status } });
}

async function runPreWorkout(user: { id: number; name: string; trainTime: string; telegramChatId: string; telegramBotToken: string }) {
  const todayName = DAY_NAMES[new Date().getDay()];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySession = await prisma.trainingSession.findFirst({
    where: { userId: user.id, date: { gte: today, lt: tomorrow } },
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

  const result = await sendTelegramMessage(user.telegramChatId, message, user.telegramBotToken, keyboard);
  await logNotification(user.id, "pre_workout", message, result.ok ? "sent" : "error");
}

async function runWeightReminder(user: { id: number; name: string; telegramChatId: string; telegramBotToken: string }) {
  const lastLog = await prisma.weightLog.findFirst({
    where: { userId: user.id },
    orderBy: { loggedAt: "desc" },
  });

  const message = weightReminderMessage({
    name: user.name.split(" ")[0],
    lastWeight: lastLog?.weightKg,
    lastWeightDate: lastLog ? new Date(lastLog.loggedAt).toLocaleDateString("es-AR") : undefined,
  });

  const result = await sendTelegramMessage(user.telegramChatId, message, user.telegramBotToken);
  await logNotification(user.id, "weight_reminder", message, result.ok ? "sent" : "error");
}

async function runNutritionReminder(user: { id: number; name: string; birthDate: Date; heightCm: number; activityLevel: string; sex: string; telegramChatId: string; telegramBotToken: string }) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const todayFoods = await prisma.foodLog.findMany({
    where: { userId: user.id, loggedAt: { gte: todayStart, lte: todayEnd } },
  });

  const consumedCalories = todayFoods.reduce((acc, f) => acc + f.kcal, 0);

  const latestWeight = await prisma.weightLog.findFirst({
    where: { userId: user.id },
    orderBy: { loggedAt: "desc" },
  });

  const age = calculateAge(new Date(user.birthDate));
  const bmr = latestWeight ? calculateBMR(latestWeight.weightKg, user.heightCm, age, user.sex) : 2000;
  const tdee = calculateTDEE(bmr, user.activityLevel);
  const targetCalories = calculateTargetCalories(tdee);
  const proteinTarget = latestWeight ? Math.round(1.8 * latestWeight.weightKg) : 150;

  const message = nutritionReminderMessage({
    name: user.name.split(" ")[0],
    targetCalories,
    proteinTarget,
    consumedCalories: Math.round(consumedCalories),
  });

  const result = await sendTelegramMessage(user.telegramChatId, message, user.telegramBotToken);
  await logNotification(user.id, "nutrition_reminder", message, result.ok ? "sent" : "error");
}

async function runMissedSession(user: { id: number; name: string; telegramChatId: string; telegramBotToken: string }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySession = await prisma.trainingSession.findFirst({
    where: { userId: user.id, date: { gte: today, lt: tomorrow }, completed: false },
  });

  if (!todaySession) return;

  const message = missedSessionMessage({
    name: user.name.split(" ")[0],
    routineName: todaySession.routineName,
  });

  const result = await sendTelegramMessage(user.telegramChatId, message, user.telegramBotToken);
  await logNotification(user.id, "missed_session", message, result.ok ? "sent" : "error");
}

// Run every minute — check which users have a notification due right now
cron.schedule("* * * * *", async () => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayName = DAY_NAMES[now.getDay()];

  try {
    const users = await prisma.user.findMany({
      where: {
        telegramChatId: { not: null },
        telegramBotToken: { not: null },
        onboardingDone: true,
      },
    });

    const activeUsers = users.filter((u) => u.telegramChatId && u.telegramBotToken) as (typeof users[0] & {
      telegramChatId: string;
      telegramBotToken: string;
    })[];

    for (const user of activeUsers) {
      const cfg = ((user.notificationConfig as unknown as NotificationConfig) || DEFAULT_CONFIG);

      const preWorkout = { ...DEFAULT_CONFIG.preWorkout, ...cfg.preWorkout };
      const nutrition  = { ...DEFAULT_CONFIG.nutritionReminder, ...cfg.nutritionReminder };
      const weight     = { ...DEFAULT_CONFIG.weightReminder, ...cfg.weightReminder };
      const missed     = { ...DEFAULT_CONFIG.missedSession, ...cfg.missedSession };

      if (preWorkout.enabled && preWorkout.time === currentTime && isTodayIncluded(preWorkout, user.trainDays, todayName)) {
        await runPreWorkout(user);
      }

      if (weight.enabled && weight.time === currentTime && isTodayIncluded(weight, user.trainDays, todayName)) {
        await runWeightReminder(user);
      }

      if (nutrition.enabled && nutrition.time === currentTime && isTodayIncluded(nutrition, user.trainDays, todayName)) {
        await runNutritionReminder(user);
      }

      if (missed.enabled && missed.time === currentTime && isTodayIncluded(missed, user.trainDays, todayName)) {
        await runMissedSession(user);
      }
    }
  } catch (error) {
    console.error("[CRON] Notification check error:", error);
  }
});

console.log("[CRON] Notification scheduler initialized (per-minute check)");
