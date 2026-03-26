"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Bell, Send, Loader2, Send as SendIcon, CheckCircle, XCircle } from "lucide-react";

interface NotifConfig {
  telegramBotToken: string;
  telegramChatId: string;
  preWorkout: boolean;
  nutritionReminder: boolean;
  weightReminder: boolean;
  missedSession: boolean;
}

interface NotifLog {
  id: number;
  type: string;
  message: string;
  sentAt: string;
  status: string;
}

const NOTIFICATION_TYPES = [
  {
    key: "preWorkout",
    label: "Pre-entrenamiento",
    desc: "Recordatorio antes de ir al gym",
    time: "6:30 AM los días de entrenamiento",
  },
  {
    key: "nutritionReminder",
    label: "Recordatorio nutricional",
    desc: "Para registrar tus comidas",
    time: "13:00 todos los días",
  },
  {
    key: "weightReminder",
    label: "Registro de peso",
    desc: "Para que no te olvides de pesarte",
    time: "8:00 AM todos los días",
  },
  {
    key: "missedSession",
    label: "Sesión perdida",
    desc: "Si no completaste el entrenamiento",
    time: "20:00 los días de entrenamiento",
  },
];

export default function NotificacionesPage() {
  const [config, setConfig] = useState<NotifConfig>({
    telegramBotToken: "",
    telegramChatId: "",
    preWorkout: true,
    nutritionReminder: true,
    weightReminder: true,
    missedSession: true,
  });
  const [history, setHistory] = useState<NotifLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/notifications/config").then((r) => r.json()),
      fetch("/api/notifications/history").then((r) => r.json()),
    ]).then(([cfg, hist]) => {
      if (cfg.config) setConfig(cfg.config);
      setHistory(hist.notifications || []);
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/notifications/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } finally {
      setSaving(false);
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
          ? "¡Mensaje de prueba enviado correctamente!"
          : data.error || "Error al enviar el mensaje",
      });
    } finally {
      setTesting(false);
    }
  }

  function formatTime(isoString: string) {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const typeLabels: Record<string, string> = {
    pre_workout: "Pre-entrenamiento",
    nutrition_reminder: "Nutricional",
    weight_reminder: "Peso",
    missed_session: "Sesión perdida",
    post_workout: "Post-entrenamiento",
    test: "Prueba",
  };

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

      {/* Config form */}
      <form onSubmit={handleSave} className="space-y-4 mb-6">
        {/* Telegram config */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Send size={16} className="text-[#6B6B65]" />
              <p className="text-sm font-medium text-[#1A1A18]">
                Configuración de Telegram
              </p>
            </div>
            {isConnected && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3B6D11]" />
                <span className="text-xs text-[#3B6D11] font-medium">Conectado</span>
              </div>
            )}
          </div>

          {/* Setup instructions */}
          <div className="bg-[#F0EFE9] rounded-[8px] p-3 mb-4 text-xs text-[#6B6B65] space-y-1">
            <p className="font-medium text-[#1A1A18]">Cómo configurar tu bot:</p>
            <p>1. Buscá <span className="font-medium text-[#1A1A18]">@BotFather</span> en Telegram → enviá <span className="font-mono">/newbot</span> → copiá el token.</p>
            <p>2. Mandá un mensaje a tu bot → buscá tu Chat ID en <span className="font-medium text-[#1A1A18]">@userinfobot</span>.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Bot Token
              </label>
              <input
                type="password"
                value={config.telegramBotToken}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, telegramBotToken: e.target.value }))
                }
                placeholder="123456789:ABCdefGHI..."
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
              <p className="text-xs text-[#A0A09A] mt-1">
                El token que te da @BotFather al crear el bot
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Chat ID
              </label>
              <input
                type="text"
                value={config.telegramChatId}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, telegramChatId: e.target.value }))
                }
                placeholder="123456789"
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
              <p className="text-xs text-[#A0A09A] mt-1">
                Tu ID de usuario de Telegram (conseguilo en @userinfobot)
              </p>
            </div>

            {/* Test button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !config.telegramBotToken || !config.telegramChatId}
                className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium border border-[rgba(0,0,0,0.12)] text-[#6B6B65] hover:bg-[#F0EFE9] transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <SendIcon size={13} />
                )}
                Enviar mensaje de prueba
              </button>

              {testResult && (
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    testResult.success ? "text-[#3B6D11]" : "text-[#A32D2D]"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle size={13} />
                  ) : (
                    <XCircle size={13} />
                  )}
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification toggles */}
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-[#6B6B65]" />
            <p className="text-sm font-medium text-[#1A1A18]">
              Tipos de notificaciones
            </p>
          </div>

          <div className="space-y-3">
            {NOTIFICATION_TYPES.map((notif) => (
              <div
                key={notif.key}
                className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)] last:border-0"
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-[#1A1A18]">
                    {notif.label}
                  </p>
                  <p className="text-xs text-[#A0A09A]">{notif.desc}</p>
                  <p className="text-xs text-[#6B6B65] mt-0.5">{notif.time}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config[notif.key as keyof NotifConfig] as boolean}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        [notif.key]: e.target.checked,
                      }))
                    }
                  />
                  <div className="w-9 h-5 bg-[#E0DFD9] peer-checked:bg-[#1A1A18] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform peer-checked:after:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>

      {/* Message templates preview */}
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4 mb-6">
        <p className="text-sm font-medium text-[#1A1A18] mb-4">
          Vista previa de mensajes
        </p>
        <div className="space-y-3">
          {[
            {
              title: "Pre-entrenamiento",
              msg: "💪 *¡Hola {nombre}!*\n\nHoy toca *{rutina}* a las {hora}.\n\n¡Dale con todo, che! Respondé \"listo\" cuando termines.",
            },
            {
              title: "Recordatorio de peso",
              msg: "⚖️ *Recordatorio de peso*\n\nAcordate de registrar tu peso antes de desayunar.\n\nRespondé con: *peso X.X*",
            },
            {
              title: "Sesión perdida",
              msg: "😅 *Che {nombre}...*\n\nNo completaste *{rutina}* de hoy. ¡No pasa nada! Un día no arruina tu progreso.",
            },
          ].map((tmpl) => (
            <div
              key={tmpl.title}
              className="bg-[#F0EFE9] rounded-[8px] p-3"
            >
              <p className="text-xs font-medium text-[#6B6B65] mb-2">
                {tmpl.title}
              </p>
              <p className="text-xs text-[#1A1A18] whitespace-pre-line leading-relaxed">
                {tmpl.msg}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
        <p className="text-sm font-medium text-[#1A1A18] mb-4">
          Historial de mensajes
        </p>
        {history.length === 0 ? (
          <p className="text-sm text-[#A0A09A]">
            Todavía no se enviaron notificaciones.
          </p>
        ) : (
          <div className="space-y-0">
            {history.slice(0, 20).map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between py-2.5 border-b border-[rgba(0,0,0,0.05)] last:border-0"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-[#1A1A18]">
                      {typeLabels[log.type] || log.type}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-[4px] ${
                        log.status === "sent"
                          ? "bg-[#EAF3DE] text-[#3B6D11]"
                          : "bg-[#FCEBEB] text-[#A32D2D]"
                      }`}
                    >
                      {log.status === "sent" ? "Enviado" : "Error"}
                    </span>
                  </div>
                  <p className="text-xs text-[#A0A09A]">
                    {formatTime(log.sentAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
