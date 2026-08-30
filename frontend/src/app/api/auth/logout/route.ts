import { NextResponse } from "next/server";
import { borrarSesion } from "@/lib/auth";

export async function POST() {
  await borrarSesion();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("userRol", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("userId", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("userName", "", { path: "/", maxAge: 0, sameSite: "lax" });
  return res;
}
