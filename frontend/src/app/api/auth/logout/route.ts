import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("userRol", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("userId", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("userName", "", { path: "/", maxAge: 0, sameSite: "lax" });
  return res;
}