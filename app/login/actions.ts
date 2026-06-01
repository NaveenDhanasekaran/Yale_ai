"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@itservicefirst.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ITS@2026bot";
// Fallback keeps login working even if SESSION_SECRET isn't set in the host env.
const SESSION_VALUE = process.env.SESSION_SECRET || "yale-admin-default-9f3a7c21e8b4";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
    const c = await cookies();
    c.set("admin_auth", SESSION_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    redirect("/");
  }
  redirect("/login?error=1");
}

export async function logout() {
  const c = await cookies();
  c.delete("admin_auth");
  redirect("/login");
}
