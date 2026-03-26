"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o contraseña incorrectos");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
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
            Bienvenido de vuelta
          </h1>
          <p className="text-sm text-[#6B6B65] mb-6">
            Ingresá tu cuenta para continuar
          </p>

          {error && (
            <div className="mb-4 p-3 bg-[#FCEBEB] rounded-[8px] text-sm text-[#A32D2D]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#6B6B65] block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              Ingresar
            </button>
          </form>

          <p className="text-sm text-[#6B6B65] text-center mt-5">
            ¿No tenés cuenta?{" "}
            <Link
              href="/register"
              className="text-[#1A1A18] font-medium hover:underline"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
