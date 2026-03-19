import { NextResponse } from "next/server"
import { clearAdminSessionCookie } from "@/lib/auth"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.headers.set("Cache-Control", "no-store")
  clearAdminSessionCookie(response)
  return response
}
