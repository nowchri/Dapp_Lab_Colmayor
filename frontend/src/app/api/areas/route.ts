import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  const r = await pool.query("SELECT * FROM areas ORDER BY nombre_area");
  return NextResponse.json(r.rows);
}