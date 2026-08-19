import { NextRequest, NextResponse } from "next/server";
import { sendConfirmacionPrestamo, sendAlertaMora } from "@/lib/email";

export async function GET(request: NextRequest) {
  const tipo = new URL(request.url).searchParams.get("tipo") || "confirmacion";

  const data = {
    estudiante_nombre: "Cristhian Gallego Torres",
    estudiante_cedula: "1061768907",
    estudiante_correo: "testpruea@gmail.com",
    estudiante_telefono: "3012345678",
    estudiante_programa: "Ingeniería Informática",
    monitor_nombre: "Monitor de Turno",
    materia: "Sistemas Embebidos",
    profesor_encargado: "Stivens Dionizio",
    curso_grupo: "TDS-401",
    fecha_inicio: new Date().toISOString(),
    fecha_limite: new Date(Date.now() + 8 * 86400000).toISOString(),
    blockchain_hash: "0xTEST...",
    dias_mora: 15,
    items: [
      { activo_nombre: "Arduino Uno R3", cantidad: 1, activo_tipo: "trazable" },
      { activo_nombre: "Cable USB", cantidad: 1, activo_tipo: "trazable" },
      { activo_nombre: "Resistencias 220 Ohm", cantidad: 5, activo_tipo: "consumible" },
    ],
  };

  let ok = false;

  if (tipo === "confirmacion") {
    ok = await sendConfirmacionPrestamo(data);
  } else {
    ok = await sendAlertaMora(data);
  }

  return NextResponse.json({
    ok,
    tipo,
    msg: ok
      ? `Email de ${tipo} enviado — revisá testpruea@gmail.com`
      : `Fallo el envío — revisá la consola del servidor`,
  });
}