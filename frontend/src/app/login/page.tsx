"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorTxt, setErrorTxt] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorTxt("");
    if (!correo.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorTxt(data.error || "Error al iniciar sesion");
        return;
      }

      // Redirect on success
      router.push("/dashboard");
    } catch {
      setErrorTxt("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-iu-primary to-[#06244A] p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-iu-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🔬</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Lab IUCMC</h1>
          <p className="text-white/70 mt-1">Sistema de Gesti&oacute;n de Pr&eacute;stamos</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-iu-primary mb-1">Iniciar Sesi&oacute;n</h2>
          <p className="text-iu-gray text-sm mb-6">Ingresa con tu correo institucional UNIMAYOR</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-iu-dark mb-1">Correo institucional</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@unimayor.edu.co"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-iu-primary focus:border-transparent outline-none transition"
                disabled={loading}
                autoFocus
              />
            </div>

            {errorTxt && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{errorTxt}</p>
            )}

            <button type="submit" disabled={loading || !correo.trim()} className="btn-primary w-full py-3 text-lg">
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-iu-gray">
              &iquest;Primera vez?{" "}
              <a href="/register" className="text-iu-primary font-medium hover:underline">Registrarme</a>
            </p>
          </div>
        </div>
        <p className="text-center text-white/50 text-xs mt-6">Laboratorio de F&iacute;sica y Sistemas Embebidos &middot; IUCMC</p>
      </div>
    </div>
  );
}
