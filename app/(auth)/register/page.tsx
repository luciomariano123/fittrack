"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrarse");
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("Ocurrió un error. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 bg-[#1A1A18] rounded-[8px] flex items-center justify-center">
            <Activity size={18} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-medium text-[#1A1A18] text-xl">FitTrack</span>
        </div>

        <div className="bg-white rounded-[14px] border border-[rgba(0,0,0,0.08)] p-6">
          <h1 className="text-lg font-medium text-[#1A1A18] mb-1">
            Creá tu cuenta
          </h1>
          <p className="text-sm text-[#6B6B65] mb-6">
            Completá el registro para empezar
          </p>

          {error && (
            <div className="mb-4 p-3 bg-[#FCEBEB] rounded-[8px] text-sm text-[#A32D2D]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Nombre
              </label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="vos@ejemplo.com"
                required
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Contraseña
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Confirmá la contraseña
              </label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full h-9 rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-3 text-sm text-[#1A1A18] placeholder:text-[#A0A09A] focus:outline-none focus:border-[#1A1A18]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-[#1A1A18] text-white rounded-[8px] text-sm font-medium hover:bg-[#1A1A18]/85 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Crear cuenta
            </button>
          </form>

          <p className="text-sm text-[#6B6B65] text-center mt-5">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="text-[#1A1A18] font-medium hover:underline"
            >
              Ingresá
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
