"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Monitor {
  id_perfil: string;
  codigo_estudiantil: string | null;
  nombre_completo: string;
  correo_institucional: string;
  telefono: string | null;
}

export default function MonitoresPage() {
  const [monitores, setMonitores] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    codigo_estudiantil: "",
    cedula: "",
    nombre_completo: "",
    correo_institucional: "",
    telefono: "",
    password: "",
  });

  useEffect(() => { cargarMonitores(); }, []);

  async function cargarMonitores() {
    try {
      const res = await fetch("/api/monitores");
      setMonitores(await res.json());
    } catch {
      toast.error("Error al cargar monitores");
    } finally {
      setLoading(false);
    }
  }

  async function crearMonitor(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre_completo || !form.correo_institucional || !form.codigo_estudiantil) {
      return toast.error("Nombre, correo y codigo son obligatorios");
    }

    setSaving(true);
    try {
      const res = await fetch("/api/monitores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al crear");
        return;
      }
      toast.success("Monitor creado correctamente");
      setShowForm(false);
      setForm({ codigo_estudiantil: "", cedula: "", nombre_completo: "", correo_institucional: "", telefono: "", password: "" });
      cargarMonitores();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  async function resetearPassword(id: string, nombre: string) {
    if (!confirm(`¿Resetear la contraseña de ${nombre}? Podrá crear una nueva en su próximo ingreso.`)) return;
    try {
      const res = await fetch(`/api/monitores/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset_password: true }) });
      if (res.ok) toast.success("Contraseña reseteada. El monitor creará una nueva al entrar.");
      else { const e = await res.json(); toast.error(e.error || "Error"); }
    } catch { toast.error("Error de conexión"); }
  }

  async function eliminarMonitor(id: string, nombre: string) {
    if (!confirm(`\xbfEliminar a ${nombre}?`)) return;
    try {
      const res = await fetch(`/api/monitores/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Monitor eliminado"); cargarMonitores(); }
      else { const e = await res.json(); toast.error(e.error || "Error"); }
    } catch { toast.error("Error de conexion"); }
  }

  if (loading) return <div className="p-8 text-center text-iu-gray">Cargando...</div>;

  return (
    <div className="min-h-screen bg-iu-light p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-iu-primary">Gestion de Monitores</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm"
          >
            {showForm ? "Cancelar" : "+ Nuevo Monitor"}
          </button>
        </div>

        {/* Formulario nuevo monitor */}
        {showForm && (
          <form onSubmit={crearMonitor} className="bg-white rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-iu-dark">Registrar nuevo monitor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-iu-dark mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                  placeholder="Ej: Juan Perez"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-iu-dark mb-1">Cedula</label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                  placeholder="Ej: 1234567890"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-iu-dark mb-1">Codigo *</label>
                <input
                  type="text"
                  value={form.codigo_estudiantil}
                  onChange={(e) => setForm({ ...form, codigo_estudiantil: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                  placeholder="Ej: 202312345"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-iu-dark mb-1">Telefono</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                  placeholder="Ej: 3012345678"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-iu-dark mb-1">Correo institucional *</label>
                <input
                  type="email"
                  value={form.correo_institucional}
                  onChange={(e) => setForm({ ...form, correo_institucional: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                  placeholder="monitor@unimayor.edu.co"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-iu-dark mb-1">Contraseña (opcional)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none"
                  placeholder="Mínimo 6 caracteres — si la dejas vacía, el monitor la crea en su primer ingreso"
                />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Creando..." : "Crear Monitor"}
            </button>
          </form>
        )}

        {/* Lista de monitores */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm">
          <h2 className="font-bold text-iu-dark mb-4">Monitores registrados ({monitores.length})</h2>
          {monitores.length === 0 ? (
            <p className="text-sm text-iu-gray text-center py-6">No hay monitores registrados.</p>
          ) : (
            <div className="space-y-2">
              {monitores.map((m) => (
                <div key={m.id_perfil} className="flex items-center justify-between bg-iu-light rounded-lg p-3">
                  <div>
                    <p className="font-medium text-iu-dark text-sm">{m.nombre_completo}</p>
                    <p className="text-xs text-iu-gray">
                      {m.correo_institucional}
                      {m.codigo_estudiantil && ` · ${m.codigo_estudiantil}`}
                      {m.telefono && ` · ${m.telefono}`}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => resetearPassword(m.id_perfil, m.nombre_completo)}
                      className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                      title="Resetear contraseña (el monitor creará una nueva)"
                    >🔑 Resetear</button>
                    <button
                      onClick={() => eliminarMonitor(m.id_perfil, m.nombre_completo)}
                      className="text-xs px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                      title="Eliminar monitor"
                    >🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}