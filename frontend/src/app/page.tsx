/**
 * page.tsx — Landing page
 * Redirige según estado de autenticación y rol.
 */

import { redirect } from "next/navigation";

export default function Home() {
  // En el cliente, redirigir según sesión
  // La lógica real se implementa en M1 con useAuth hook
  redirect("/login");
}
