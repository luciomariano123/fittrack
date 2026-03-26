"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MainLayout } from "@/components/layout/main-layout";
import { Loader2, Save } from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  heightCm: number;
  weightGoalKg: number;
  activityLevel: string;
  trainDays: string;
  trainTime: string;
}

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.user);
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
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
        <h1 className="text-xl font-medium text-[#1A1A18]">Configuración</h1>
        <p className="text-sm text-[#6B6B65] mt-0.5">
          Actualizá tu perfil y preferencias
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-sm font-medium text-[#1A1A18] mb-4">Perfil</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Nombre
              </label>
              <input
                value={profile.name}
                onChange={(e) => setProfile((p) => p ? { ...p, name: e.target.value } : p)}
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Email
              </label>
              <input
                value={profile.email}
                disabled
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-[#F0EFE9] px-3 text-sm text-[#A0A09A]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[10px] border border-[rgba(0,0,0,0.08)] p-4">
          <p className="text-sm font-medium text-[#1A1A18] mb-4">
            Datos físicos
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Altura (cm)
              </label>
              <input
                type="number"
                value={profile.heightCm}
                onChange={(e) =>
                  setProfile((p) => p ? { ...p, heightCm: parseFloat(e.target.value) } : p)
                }
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Peso objetivo (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={profile.weightGoalKg}
                onChange={(e) =>
                  setProfile((p) => p ? { ...p, weightGoalKg: parseFloat(e.target.value) } : p)
                }
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm focus:outline-none focus:border-[#1A1A18]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium bg-[#1A1A18] text-white hover:bg-[#1A1A18]/85 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Guardar cambios
          </button>
          {saved && (
            <span className="text-xs text-[#3B6D11]">¡Guardado!</span>
          )}
        </div>
      </form>
    </MainLayout>
  );
}
