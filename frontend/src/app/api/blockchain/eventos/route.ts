import { NextResponse } from "next/server";
import { getEventosRecientes } from "@/lib/cadena";

// GET /api/blockchain/eventos — eventos recientes de la cadena (dashboard)
export async function GET() {
  try {
    const eventos = await getEventosRecientes(20);
    return NextResponse.json(eventos);
  } catch (error: any) {
    console.error("[blockchain/eventos]", error.message);
    return NextResponse.json({ error: "Error al consultar eventos" }, { status: 500 });
  }
}
