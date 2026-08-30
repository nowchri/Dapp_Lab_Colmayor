"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PasswordInput from "@/components/PasswordInput";

export default function PrimerIngresoPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.authenticated) router.push("/login");
      else if (d.user.rol !== "admin" && d.user.rol !== "monitor") router.push("/dashboard");
    }).catch(() => router.push("/login"));
  }, [router]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    if (password !== password2) return toast.error("Las contraseñas no coinciden");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, password2 }),
      });
      const d = await res.json();
      if (res.ok) {
        toast.success("Contraseña creada correctamente");
        router.push("/dashboard");
      } else {
        toast.error(d.error || "Error al guardar");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center px-4">
      <div className="card-glass w-full max-w-md p-8 space-y-5">
        <div className="text-center">
          <p className="text-4xl mb-2">🔐</p>
          <h1 className="text-xl font-bold text-[#09488D]">Crea tu contraseña</h1>
          <p className="text-sm text-slate-500 mt-1">
            Es tu primer ingreso como parte del equipo del laboratorio.
            A partir de ahora, para entrar necesitarás correo + contraseña.
          </p>
        </div>
        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nueva contraseña</label>
            <PasswordInput value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Confirmar contraseña</label>
            <PasswordInput value={password2} onChange={setPassword2} placeholder="Repetí la contraseña" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg">
            {loading ? "Guardando..." : "Guardar y entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
