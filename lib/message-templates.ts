interface PreWorkoutVars {
  name: string;
  routineName: string;
  time: string;
}

interface PostWorkoutVars {
  name: string;
  routineName: string;
  duration: number;
}

interface NutritionReminderVars {
  name: string;
  targetCalories: number;
  proteinTarget: number;
  consumedCalories: number;
}

interface WeightReminderVars {
  name: string;
  lastWeight?: number;
  lastWeightDate?: string;
}

interface MissedSessionVars {
  name: string;
  routineName: string;
}

export function preWorkoutMessage(vars: PreWorkoutVars): string {
  return `💪 *¡Hola ${vars.name}!*

Hoy toca *${vars.routineName}* a las ${vars.time}.

¡Dale con todo, che! Respondé "listo" cuando termines y lo registro automáticamente.`;
}

export function postWorkoutMessage(vars: PostWorkoutVars): string {
  return `✅ *¡Máquina, ${vars.name}!*

Completaste *${vars.routineName}* en ${vars.duration} minutos.

¡Gran entrenamiento! Cada sesión te acerca más a tu objetivo. 🔥`;
}

export function nutritionReminderMessage(vars: NutritionReminderVars): string {
  const remaining = vars.targetCalories - vars.consumedCalories;
  const emoji = remaining > 0 ? "🥗" : "✅";

  return `${emoji} *Recordatorio nutricional - ${vars.name}*

Objetivo: *${vars.targetCalories} kcal* | *${vars.proteinTarget}g proteína*
Consumido: *${vars.consumedCalories} kcal*
${remaining > 0 ? `Te quedan ${remaining} kcal por consumir.` : "¡Ya alcanzaste tu objetivo calórico!"}

Abrí FitTrack para registrar tus comidas. 📱`;
}

export function weightReminderMessage(vars: WeightReminderVars): string {
  const lastEntry = vars.lastWeight
    ? `\nÚltimo registro: *${vars.lastWeight} kg* (${vars.lastWeightDate})`
    : "";

  return `⚖️ *Recordatorio de peso - ${vars.name}*
${lastEntry}

¡Acordate de registrar tu peso esta mañana antes de desayunar para que el seguimiento sea preciso!

Respondé con: *peso X.X* (ej: peso 78.5)`;
}

export function missedSessionMessage(vars: MissedSessionVars): string {
  return `😅 *Che ${vars.name}...*

No completaste *${vars.routineName}* de hoy.

¡No pasa nada! ¿Querés reagendarla para mañana? Abrí FitTrack para gestionar tu rutina.

Un día sin entrenar no arruina tu progreso, ¡pero dos seguidos sí! 💪`;
}

export function weightLoggedMessage(name: string, weight: number): string {
  return `✅ *Peso registrado*

${name}, anotamos *${weight} kg* en tu historial.

¡Seguí así! Cada dato suma para tu proyección de progreso. 📈`;
}

export function sessionCompletedMessage(name: string, routine: string): string {
  return `🎉 *¡Sesión completada!*

${name}, marcamos *${routine}* como completada.

¡Sos un crack! Seguí con la buena racha. 💪`;
}
