export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  return "Obesidad";
}

// Devine formula
export function calculateIdealWeight(heightCm: number, sex: string): number {
  const heightInches = heightCm / 2.54;
  if (sex === "male") {
    return 50 + 2.3 * (heightInches - 60);
  } else {
    return 45.5 + 2.3 * (heightInches - 60);
  }
}

// Mifflin-St Jeor BMR
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: string
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export function getActivityMultiplier(activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return multipliers[activityLevel] ?? 1.55;
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  return bmr * getActivityMultiplier(activityLevel);
}

export function calculateTargetCalories(tdee: number): number {
  return Math.round(tdee - 500);
}

export function calculateDailyProtein(weightKg: number): number {
  return Math.round(1.8 * weightKg);
}

export function calculateDaysToGoal(
  currentWeight: number,
  goalWeight: number,
  weeklyDeficit = 3500
): number {
  if (currentWeight <= goalWeight) return 0;
  const totalLoss = currentWeight - goalWeight;
  const kgToLose = totalLoss;
  // ~7700 kcal per kg of fat, deficit 500/day = 3500/week
  const weeksNeeded = (kgToLose * 7700) / (500 * 7);
  return Math.round(weeksNeeded * 7);
}

export function calculateGoalDate(daysToGoal: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysToGoal);
  return date;
}

export function calculateSmartGoal(weightKg: number, heightCm: number, sex: string): number {
  // Target IMC of 22 (middle of normal range 18.5-24.9)
  const heightM = heightCm / 100;

  // If already in healthy range, target IMC 21
  const currentBMI = weightKg / (heightM * heightM);
  const targetBMI = currentBMI >= 18.5 && currentBMI <= 24.9 ? 21 : 22;

  const targetWeight = targetBMI * heightM * heightM;

  // Don't suggest losing more than 20% of body weight at once
  const minWeight = weightKg * 0.8;
  return Math.round(Math.max(targetWeight, minWeight) * 10) / 10;
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Linear regression for weight projection using last N data points
export function linearRegression(
  data: { x: number; y: number }[]
): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.y ?? 0 };

  const sumX = data.reduce((a, b) => a + b.x, 0);
  const sumY = data.reduce((a, b) => a + b.y, 0);
  const sumXY = data.reduce((a, b) => a + b.x * b.y, 0);
  const sumX2 = data.reduce((a, b) => a + b.x * b.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function projectWeightData(
  weightLogs: { weightKg: number; loggedAt: Date }[],
  daysAhead = 30
): { date: string; projected: number }[] {
  const sorted = [...weightLogs].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );

  const last14 = sorted.slice(-14);
  if (last14.length < 2) return [];

  const startTime = new Date(last14[0].loggedAt).getTime();
  const points = last14.map((log) => ({
    x: (new Date(log.loggedAt).getTime() - startTime) / (1000 * 60 * 60 * 24),
    y: log.weightKg,
  }));

  const { slope, intercept } = linearRegression(points);

  const lastDate = new Date(sorted[sorted.length - 1].loggedAt);
  const projections: { date: string; projected: number }[] = [];

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    const xVal = points[points.length - 1].x + i;
    const projected = Math.max(intercept + slope * xVal, 0);
    projections.push({
      date: date.toISOString().split("T")[0],
      projected: Math.round(projected * 10) / 10,
    });
  }

  return projections;
}
