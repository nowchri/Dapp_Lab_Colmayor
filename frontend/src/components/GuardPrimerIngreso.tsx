"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Redirige a /primer-ingreso si un admin/monitor aún no creó su contraseña. */
export default function GuardPrimerIngreso() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/primer-ingreso" || pathname === "/login" || pathname === "/register") return;
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.authenticated && d.primer_ingreso) router.replace("/primer-ingreso");
      })
      .catch(() => {});
  }, [pathname, router]);

  return null;
}
