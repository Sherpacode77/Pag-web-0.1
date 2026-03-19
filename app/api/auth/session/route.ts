import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = getAdminSession(request)

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const response = NextResponse.json({
    authenticated: true,
    user: { username: session.username },
  })

  response.headers.set("Cache-Control", "no-store")
  return response
}
