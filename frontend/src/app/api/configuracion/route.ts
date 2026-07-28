import { NextRequest, NextResponse } from "next/server";

// In-memory config store (in production, use a settings table)
let settings: Record<string, string> = {
  bloqueo_por_mora: "true",
};

export async function GET() {
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    settings = { ...settings, ...body };
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
}
