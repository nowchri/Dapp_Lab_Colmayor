"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Estudiante {
  id_perfil: string; codigo_estudiantil: string | null; cedula: string | null;
  nombre_completo: string; correo_institucional: string; telefono: string | null;
}

export default function EstudiantesPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Estudiante>>({});

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    try {
      const res = await fetch("/api/estudiantes");
      setEstudiantes(await res.json());
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }

  function iniciarEdicion(e: Estudiante) {
    setEditing(e.id_perfil);
    setForm({ nombre_completo: e.nombre_completo, codigo_estudiantil: e.codigo_estudiantil, cedula: e.cedula, telefono: e.telefono, correo_institucional: e.correo_institucional });
  }

  async function guardarCambios() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/estudiantes/${editing}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { toast.success("Actualizado"); setEditing(null); cargar(); }
      else { const e = await res.json(); toast.error(e.error || "Error"); }
    } catch { toast.error("Error"); }
    finally { setSaving(false); }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/estudiantes/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Eliminado"); cargar(); }
      else { const e = await res.json(); toast.error(e.error || "No se puede eliminar"); }
    } catch { toast.error("Error"); }
  }

  const filtrados = estudiantes.filter(e =>
    e.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.codigo_estudiantil && e.codigo_estudiantil.includes(busqueda)) ||
    e.correo_institucional.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]"><div className="w-8 h-8 border-2 border-[#09488D] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-12">
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-[#09488D]">🎓 Estudiantes</h1>
            <span className="pill-primary">{estudiantes.length} registrados</span>
          </div>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, código o correo..." className="input-glass max-w-full md:max-w-md" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-6 px-6">
        {editing && (
          <div className="card-glass mb-6 space-y-4">
            <h2 className="font-bold text-[#09488D]">Editar estudiante</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="text-xs text-slate-500">Nombre</label><input type="text" value={form.nombre_completo || ""} onChange={e => setForm({...form, nombre_completo: e.target.value})} className="input-glass" /></div>
              <div><label className="text-xs text-slate-500">Código</label><input type="text" value={form.codigo_estudiantil || ""} onChange={e => setForm({...form, codigo_estudiantil: e.target.value})} className="input-glass" /></div>
              <div><label className="text-xs text-slate-500">Cédula</label><input type="text" value={form.cedula || ""} onChange={e => setForm({...form, cedula: e.target.value})} className="input-glass" /></div>
              <div><label className="text-xs text-slate-500">Teléfono</label><input type="text" value={form.telefono || ""} onChange={e => setForm({...form, telefono: e.target.value})} className="input-glass" /></div>
              <div className="sm:col-span-2"><label className="text-xs text-slate-500">Correo</label><input type="email" value={form.correo_institucional || ""} onChange={e => setForm({...form, correo_institucional: e.target.value})} className="input-glass" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={guardarCambios} disabled={saving} className="btn-primary text-sm">{saving ? "Guardando..." : "Guardar cambios"}</button>
              <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancelar</button>
            </div>
          </div>
        )}

        <div className="card-glass overflow-x-auto" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {filtrados.length === 0 ? (
            <p className="text-center py-8 text-slate-400">No se encontraron estudiantes.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6F9] sticky top-0">
                <tr className="text-left text-slate-500">
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium hidden sm:table-cell">Código</th>
                  <th className="p-3 font-medium hidden md:table-cell">Correo</th>
                  <th className="p-3 font-medium hidden md:table-cell">Teléfono</th>
                  <th className="p-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(e => (
                  <tr key={e.id_perfil} className="border-t border-gray-50 hover:bg-[#F4F6F9]/50">
                    <td className="p-3 font-medium text-[#09488D]">{e.nombre_completo}</td>
                    <td className="p-3 text-slate-500 hidden sm:table-cell">{e.codigo_estudiantil || "—"}</td>
                    <td className="p-3 text-slate-500 hidden md:table-cell">{e.correo_institucional}</td>
                    <td className="p-3 text-slate-500 hidden md:table-cell">{e.telefono || "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => iniciarEdicion(e)} className="text-xs px-2 py-1 rounded-lg bg-[#09488D]/10 text-[#09488D] hover:bg-[#09488D]/20">✏️</button>
                        <button onClick={() => eliminar(e.id_perfil, e.nombre_completo)} className="text-xs px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}