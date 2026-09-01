import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  const pool = getPool();
  const r = await pool.query("SELECT * FROM areas ORDER BY nombre_area");
  return NextResponse.json(r.rows);
}