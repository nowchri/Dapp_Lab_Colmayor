import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const ck = cookies();
  const sid = ck.get("session")?.value;
  const userName = ck.get("userName")?.value || "";
  const userRol = ck.get("userRol")?.value;

  if (!sid || !userRol) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: { nombre_completo: userName, rol: userRol },
  });
}
