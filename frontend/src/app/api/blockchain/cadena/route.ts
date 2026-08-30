import { NextRequest, NextResponse } from "next/server";
import { getCadena, verificarCadena } from "@/lib/cadena";
import { getSessionUser } from "@/lib/auth";

// GET /api/blockchain/cadena?page=1&limit=30&q=... — libro contable (admin/monitor)
export async function GET(request: NextRequest) {
  const usuario = await getSessionUser();
  if (!usuario || usuario.rol !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "30", 10) || 30));
  const q = (sp.get("q") || "").trim();

  try {
    const [cadena, verif] = await Promise.all([
      getCadena(page, limit, q),
      verificarCadena(),
    ]);
    return NextResponse.json({ ...cadena, cadena_ok: verif.ok, total_eslabones: verif.registros });
  } catch (error: any) {
    console.error("[blockchain/cadena]", error.message);
    return NextResponse.json({ error: "Error al consultar la cadena" }, { status: 500 });
  }
}
