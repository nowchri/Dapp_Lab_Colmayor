"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    cedula: "",
    telefono: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [okMsg, setOkMsg] = useState(false);

  function esValido(c: string) {
    return c.toLowerCase().endsWith("@unimayor.edu.co");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const limpio = form.email.trim().toLowerCase();
    if (!limpio) { setMsg("Ingresa tu correo institucional"); return; }
    if (!esValido(limpio)) { setMsg("Correo invalido. Debe ser @unimayor.edu.co"); return; }
    if (!form.codigo.trim()) { setMsg("Ingresa tu codigo estudiantil"); return; }
    if (!form.nombre.trim()) { setMsg("Ingresa tu nombre completo"); return; }
    if (!form.cedula.trim()) { setMsg("Ingresa tu cedula"); return; }
    if (!form.telefono.trim()) { setMsg("Ingresa tu telefono"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo_institucional: limpio,
          codigo_estudiantil: form.codigo.trim(),
          nombre_completo: form.nombre.trim(),
          cedula: form.cedula.trim(),
          telefono: form.telefono.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Error al registrar");
        return;
      }
      setOkMsg(true);
      setMsg("Registro exitoso. Redirigiendo al login...");
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setMsg("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-iu-primary to-[#06244A] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-5">
        <h2 className="text-2xl font-bold text-iu-primary">Crear cuenta</h2>
        <p className="text-sm text-iu-gray">Todos los campos son obligatorios</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Nombre completo *</label>
            <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Cristhian Gallego" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-iu-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Cedula *</label>
            <input type="text" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })}
              placeholder="Ej: 1234567890" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-iu-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Codigo estudiantil *</label>
            <input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })}
              placeholder="Ej: 202312345" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-iu-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Telefono *</label>
            <input type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
              placeholder="Ej: 3012345678" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-iu-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-iu-dark mb-1">Correo institucional *</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="nombre@unimayor.edu.co" className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-iu-primary" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
            {loading ? "Creando..." : "Registrarme"}
          </button>

          {msg && (
            <p className={`text-sm text-center ${okMsg ? "text-green-600" : "text-red-600"}`}>
              {msg}
            </p>
          )}
        </form>

        <p className="text-xs text-iu-gray text-center">
          Ya tienes cuenta?{" "}
          <a href="/login" className="text-iu-primary hover:underline">
            Inicia sesion
          </a>
        </p>
      </div>
    </div>
  );
}