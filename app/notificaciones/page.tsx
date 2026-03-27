"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Bell, Send, Loader2, Send as SendIcon, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

interface NotifSchedule {
  enabled: boolean;
  time: string;
  mode: "train" | "all" | "custom";
  customDays: string[];
}

interface CustomNotif {
  id: string;
  label: string;
  message: string;
  enabled: boolean;
  time: string;
  mode: "train" | "all" | "custom";
  customDays: string[];
}

interface NotifConfig {
  telegramBotToken: string;
  telegramChatId: string;
  preWorkout: NotifSchedule;
  nutritionReminder: NotifSchedule;
  weightReminder: NotifSchedule;
  missedSession: NotifSchedule;
  customNotifications: CustomNotif[];
}

interface NotifLog {
  id: number;
  type: string;
  message: string;
  sentAt: string;
  status: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAYS_SHORT = ["L", "Ma", "Mi", "J", "V", "S", "D"];

const DEFAULT_SCHEDULE: NotifSchedule = { enabled: true, time: "08:00", mode: "all", customDays: [] };

const NOTIFICATION_TYPES = [
  {
    key: "preWorkout" as keyof Omit<NotifConfig, "telegramBotToken" | "telegramChatId">,
    label: "Pre-entrenamiento",
    desc: "Recordatorio antes de ir al gym",
    defaultTime: "06:30",
    defaultMode: "train" as const,
  },
  {
    key: "nutritionReminder" as keyof Omit<NotifConfig, "telegramBotToken" | "telegramChatId">,
    label: "Recordatorio nutricional",
    desc: "Para registrar tus comidas",
    defaultTime: "13:00",
    defaultMode: "all" as const,
  },
  {
    key: "weightReminder" as keyof Omit<NotifConfig, "telegramBotToken" | "telegramChatId">,
    label: "Registro de peso",
    desc: "Para que no te olvides de pesarte",
    defaultTime: "08:00",
    defaultMode: "all" as const,
  },
  {
    key: "missedSession" as keyof Omit<NotifConfig, "telegramBotToken" | "telegramChatId">,
    label: "Sesión perdida",
    desc: "Si no completaste el entrenamiento",
    defaultTime: "20:00",
    defaultMode: "train" as const,
  },
];

const DEFAULT_CONFIG: NotifConfig = {
  telegramBotToken: "",
  telegramChatId: "",
  preWorkout:           { enabled: true, time: "06:30", mode: "train", customDays: [] },
  nutritionReminder:    { enabled: true, time: "13:00", mode: "all",   customDays: [] },
  weightReminder:       { enabled: true, time: "08:00", mode: "all",   customDays: [] },
  missedSession:        { enabled: true, time: "20:00", mode: "train", customDays: [] },
  customNotifications:  [],
};

function modeLabel(mode: string) {
  if (mode === "train") return "días de entreno";
  if (mode === "all") return "todos los días";
  return "días personalizados";
}

function NotifCard({ notif, schedule, onChange }: {
  notif: typeof NOTIFICATION_TYPES[0];
  schedule: NotifSchedule;
  onChange: (s: NotifSchedule) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const s = { ...DEFAULT_SCHEDULE, ...schedule };

  function toggleDay(day: string) {
    const days = s.customDays.includes(day)
      ? s.customDays.filter(d => d !== day)
      : [...s.customDays, day];
    onChange({ ...s, customDays: days });
  }

  return (
    <div className="border border-[rgba(0,0,0,0.08)] rounded-[10px] overflow-hidden">
      {/* Main row */}
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex-1 pr-3">
          <p className="text-sm font-medium text-[#1A1A18]">{notif.label}</p>
          <p className="text-xs text-[#A0A09A]">{notif.desc}</p>
          <p className="text-xs text-[#6B6B65] mt-0.5">
            <Clock size={10} className="inline mr-0.5 mb-px" />
            {s.time} · {modeLabel(s.mode)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="text-[#A0A09A] hover:text-[#1A1A18] transition-colors"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={s.enabled}
              onChange={e => onChange({ ...s, enabled: e.target.checked })}
            />
            <div className="w-9 h-5 bg-[#E0DFD9] peer-checked:bg-[#1A1A18] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
          </label>
        </div>
      </div>

      {/* Schedule config (expanded) */}
      {expanded && (
        <div className="border-t border-[rgba(0,0,0,0.06)] bg-[#FAFAF8] px-4 py-3 space-y-3">
          {/* Time */}
          <div>
            <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Horario</label>
            <input
              type="time"
              value={s.time}
              onChange={e => onChange({ ...s, time: e.target.value })}
              className="h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
            />
          </div>

          {/* Day mode */}
          <div>
            <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Días</label>
            <div className="flex gap-1.5 flex-wrap">
              {(["train", "all", "custom"] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange({ ...s, mode })}
                  className={`px-2.5 py-1 rounded-[6px] text-xs font-medium border transition-colors ${
                    s.mode === mode
                      ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                      : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                  }`}
                >
                  {mode === "train" ? "Días de entreno" : mode === "all" ? "Todos los días" : "Personalizado"}
                </button>
              ))}
            </div>

            {/* Custom day picker */}
            {s.mode === "custom" && (
              <div className="flex gap-1.5 mt-2">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-7 h-7 rounded-full text-xs font-medium border transition-colors ${
                      s.customDays.includes(day)
                        ? "bg-[#1A1A18] text-white border-[#1A1A18]"
                        : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"
                    }`}
                  >
                    {DAYS_SHORT[i]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomNotifCard({ notif, onChange, onDelete }: {
  notif: CustomNotif;
  onChange: (n: CustomNotif) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function toggleDay(day: string) {
    const days = notif.customDays.includes(day)
      ? notif.customDays.filter(d => d !== day)
      : [...notif.customDays, day];
    onChange({ ...notif, customDays: days });
  }

  return (
    <div className="border border-[rgba(0,0,0,0.08)] rounded-[10px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white">
        <div className="flex-1 pr-3">
          <p className="text-sm font-medium text-[#1A1A18]">{notif.label || "Sin nombre"}</p>
          <p className="text-xs text-[#A0A09A] truncate max-w-[200px]">{notif.message || "Sin mensaje"}</p>
          <p className="text-xs text-[#6B6B65] mt-0.5">
            <Clock size={10} className="inline mr-0.5 mb-px" />
            {notif.time} · {modeLabel(notif.mode)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setExpanded(e => !e)} className="text-[#A0A09A] hover:text-[#1A1A18] transition-colors">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={notif.enabled} onChange={e => onChange({ ...notif, enabled: e.target.checked })} />
            <div className="w-9 h-5 bg-[#E0DFD9] peer-checked:bg-[#1A1A18] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
          </label>
          <button type="button" onClick={onDelete} className="text-[#A0A09A] hover:text-[#A32D2D] transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[rgba(0,0,0,0.06)] bg-[#FAFAF8] px-4 py-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Nombre</label>
            <input
              type="text"
              value={notif.label}
              onChange={e => onChange({ ...notif, label: e.target.value })}
              placeholder="Ej: Recordatorio de cena"
              className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Mensaje</label>
            <textarea
              value={notif.message}
              onChange={e => onChange({ ...notif, message: e.target.value })}
              placeholder="Ej: ¡Hora de cenar! No te olvides de registrar tus comidas."
              rows={2}
              className="w-full rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#1A1A18] resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Horario</label>
            <input
              type="time"
              value={notif.time}
              onChange={e => onChange({ ...notif, time: e.target.value })}
              className="h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Días</label>
            <div className="flex gap-1.5 flex-wrap">
              {(["train", "all", "custom"] as const).map(mode => (
                <button key={mode} type="button" onClick={() => onChange({ ...notif, mode })}
                  className={`px-2.5 py-1 rounded-[6px] text-xs font-medium border transition-colors ${notif.mode === mode ? "bg-[#1A1A18] text-white border-[#1A1A18]" : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"}`}>
                  {mode === "train" ? "Días de entreno" : mode === "all" ? "Todos los días" : "Personalizado"}
                </button>
              ))}
            </div>
            {notif.mode === "custom" && (
              <div className="flex gap-1.5 mt-2">
                {DAYS.map((day, i) => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`w-7 h-7 rounded-full text-xs font-medium border transition-colors ${notif.customDays.includes(day) ? "bg-[#1A1A18] text-white border-[#1A1A18]" : "bg-white text-[#6B6B65] border-[rgba(0,0,0,0.12)] hover:bg-[#F0EFE9]"}`}>
                    {DAYS_SHORT[i]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NotificacionesPage() {
  const [config, setConfig] = useState<NotifConfig>(DEFAULT_CONFIG);
  const [history, setHistory] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/notifications/config").then((r) => r.json()),
      fetch("/api/notifications/history").then((r) => r.json()),
    ]).then(([cfg, hist]) => {
      if (cfg.config) {
        setConfig({
          ...DEFAULT_CONFIG,
          ...cfg.config,
          preWorkout:           { ...DEFAULT_CONFIG.preWorkout,        ...cfg.config.preWorkout },
          nutritionReminder:    { ...DEFAULT_CONFIG.nutritionReminder, ...cfg.config.nutritionReminder },
          weightReminder:       { ...DEFAULT_CONFIG.weightReminder,    ...cfg.config.weightReminder },
          missedSession:        { ...DEFAULT_CONFIG.missedSession,     ...cfg.config.missedSession },
          customNotifications:  Array.isArray(cfg.config.customNotifications) ? cfg.config.customNotifications : [],
        });
      }
      setHistory(hist.notifications || []);
      setLoading(false);
    });
  }, []);

  function addCustomNotif() {
    const newNotif: CustomNotif = {
      id: Date.now().toString(),
      label: "",
      message: "",
      enabled: true,
      time: "20:00",
      mode: "all",
      customDays: [],
    };
    setConfig(p => ({ ...p, customNotifications: [...p.customNotifications, newNotif] }));
  }

  function updateCustomNotif(id: string, updated: CustomNotif) {
    setConfig(p => ({ ...p, customNotifications: p.customNotifications.map(n => n.id === id ? updated : n) }));
  }

  function deleteCustomNotif(id: string) {
    setConfig(p => ({ ...p, customNotifications: p.customNotifications.filter(n => n.id !== id) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/notifications/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSetupWebhook() {
    setWebhookLoading(true);
    setWebhookResult(null);
    try {
      const webhookUrl = `${window.location.origin}/api/webhook/telegram`;
      const res = await fetch("/api/notifications/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      setWebhookResult({
        success: res.ok,
        message: res.ok
          ? "¡Webhook activado! Tu bot ya puede recibir mensajes."
          : data.error || "Error al configurar el webhook",
      });
    } finally {
      setWebhookLoading(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test" }),
      });
      const data = await res.json();
      setTestResult({
        success: res.ok,
        message: res.ok
          ? "¡Mensaje de prueba enviado!"
          : data.error || "Error al enviar el mensaje",
      });
    } finally {
      setTesting(false);
    }
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleDateString("es-AR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  function getTypeLabel(type: string): string {
    const fixed: Record<string, string> = {
      pre_workout: "Pre-entrenamiento",
      nutrition_reminder: "Nutricional",
      weight_reminder: "Peso",
      missed_session: "Sesión perdida",
      test: "Prueba",
    };
    if (fixed[type]) return fixed[type];
    if (type.startsWith("custom_")) {
      const id = type.replace("custom_", "");
      const found = config.customNotifications.find(n => n.id === id);
      return found?.label || "Personalizado";
    }
    return type;
  }

  const isConnected = !!(config.telegramBotToken && config.telegramChatId);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#1A1A18] border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-xl font-medium text-[#1A1A18]">Notificaciones</h1>
        <p className="text-sm text-[#6B6B65] mt-0.5">
          Configurá tus recordatorios por Telegram
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 mb-6">
        {/* Telegram config */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-[#6B6B65]" />
              <p className="text-sm font-medium text-[#1A1A18]">Configuración de Telegram</p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3B6D11]" />
                <span className="text-xs text-[#3B6D11] font-medium">Conectado</span>
              </div>
            )}
          </div>

          <div className="bg-[#F0EFE9] rounded-[8px] p-3 mb-4 text-xs text-[#6B6B65] space-y-1.5">
            <p className="font-medium text-[#1A1A18]">Cómo configurar tu bot (3 pasos):</p>
            <p>1. Buscá <span className="font-medium text-[#1A1A18]">@BotFather</span> en Telegram → enviá <span className="font-mono bg-white px-1 rounded">/newbot</span> → copiá el token.</p>
            <p>2. Abrí tu bot en Telegram y mandá cualquier mensaje. Buscá <span className="font-medium text-[#1A1A18]">@userinfobot</span> → te dice tu Chat ID.</p>
            <p>3. Pegá ambos acá abajo y hacé click en <span className="font-medium text-[#1A1A18]">Activar webhook</span>.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Bot Token</label>
              <input
                type="password"
                value={config.telegramBotToken}
                onChange={(e) => setConfig((p) => ({ ...p, telegramBotToken: e.target.value }))}
                placeholder="123456789:ABCdefGHI..."
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">Chat ID</label>
              <input
                type="text"
                value={config.telegramChatId}
                onChange={(e) => setConfig((p) => ({ ...p, telegramChatId: e.target.value }))}
                placeholder="123456789"
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            {/* Webhook */}
            <div className="bg-[#F0EFE9] rounded-[8px] p-3">
              <p className="text-xs font-medium text-[#1A1A18] mb-1">Paso 3 — Activar el bot</p>
              <p className="text-xs text-[#6B6B65] mb-2">Registrá el webhook para que tu bot pueda recibir mensajes.</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSetupWebhook}
                  disabled={webhookLoading || !config.telegramBotToken}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium bg-[#1A1A18] text-white disabled:opacity-50 transition-colors"
                >
                  {webhookLoading ? <Loader2 size={13} className="animate-spin" /> : <SendIcon size={13} />}
                  Activar webhook
                </button>
                {webhookResult && (
                  <div className={`flex items-center gap-1.5 text-xs ${webhookResult.success ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
                    {webhookResult.success ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {webhookResult.message}
                  </div>
                )}
              </div>
            </div>

            {/* Test */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !config.telegramBotToken || !config.telegramChatId}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[rgba(0,0,0,0.12)] text-[#6B6B65] hover:bg-[#F0EFE9] transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 size={13} className="animate-spin" /> : <SendIcon size={13} />}
                Enviar mensaje de prueba
              </button>
              {testResult && (
                <div className={`flex items-center gap-1.5 text-xs ${testResult.success ? "text-[#3B6D11]" : "text-[#A32D2D]"}`}>
                  {testResult.success ? <CheckCircle size={13} /> : <XCircle size={13} />}
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification schedules */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-[#6B6B65]" />
            <p className="text-sm font-medium text-[#1A1A18]">Tipos de notificaciones</p>
          </div>
          <p className="text-xs text-[#A0A09A] mb-4">Tocá el ▾ para cambiar horario y días de cada notificación</p>

          <div className="space-y-2">
            {NOTIFICATION_TYPES.map((notif) => (
              <NotifCard
                key={notif.key}
                notif={notif}
                schedule={config[notif.key] as NotifSchedule}
                onChange={(s) => setConfig(p => ({ ...p, [notif.key]: s }))}
              />
            ))}
          </div>
        </div>

        {/* Custom notifications */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-[#6B6B65]" />
              <p className="text-sm font-medium text-[#1A1A18]">Recordatorios personalizados</p>
            </div>
            <button
              type="button"
              onClick={addCustomNotif}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors"
            >
              <Plus size={12} />
              Agregar
            </button>
          </div>
          <p className="text-xs text-[#A0A09A] mb-4">Creá tus propios recordatorios con el mensaje que quieras</p>

          {config.customNotifications.length === 0 ? (
            <p className="text-xs text-[#A0A09A] text-center py-3">No hay recordatorios personalizados. Tocá "Agregar" para crear uno.</p>
          ) : (
            <div className="space-y-2">
              {config.customNotifications.map(notif => (
                <CustomNotifCard
                  key={notif.id}
                  notif={notif}
                  onChange={(n) => updateCustomNotif(notif.id, n)}
                  onDelete={() => deleteCustomNotif(notif.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar cambios
          </button>
          {saved && <span className="text-xs text-[#3B6D11]">¡Guardado!</span>}
        </div>
      </form>

      {/* History */}
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
        <p className="text-sm font-medium text-[#1A1A18] mb-4">Historial de mensajes</p>
        {history.length === 0 ? (
          <p className="text-sm text-[#A0A09A]">Todavía no se enviaron notificaciones.</p>
        ) : (
          <div className="space-y-0">
            {history.slice(0, 20).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2.5 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-[#1A1A18]">{getTypeLabel(log.type)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-[4px] ${log.status === "sent" ? "bg-[#EAF3DE] text-[#3B6D11]" : "bg-[#FCEBEB] text-[#A32D2D]"}`}>
                      {log.status === "sent" ? "Enviado" : "Error"}
                    </span>
                  </div>
                  <p className="text-xs text-[#A0A09A]">{formatTime(log.sentAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
