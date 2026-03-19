import { NextRequest, NextResponse } from "next/server"
import {
  createSessionToken,
  getClientIp,
  setAdminSessionCookie,
  validateAdminCredentials,
} from "@/lib/auth"

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000

type AttemptState = {
  count: number
  windowStartedAt: number
  blockedUntil: number
}

const loginAttempts = new Map<string, AttemptState>()

function getAttemptKey(request: NextRequest, username: string) {
  return `${getClientIp(request)}:${username.toLowerCase()}`
}

function isBlocked(key: string) {
  const now = Date.now()
  const state = loginAttempts.get(key)

  if (!state) {
    return false
  }

  if (state.blockedUntil > now) {
    return true
  }

  if (now - state.windowStartedAt > WINDOW_MS) {
    loginAttempts.delete(key)
  }

  return false
}

function registerFailedAttempt(key: string) {
  const now = Date.now()
  const current = loginAttempts.get(key)

  if (!current || now - current.windowStartedAt > WINDOW_MS) {
    loginAttempts.set(key, {
      count: 1,
      windowStartedAt: now,
      blockedUntil: 0,
    })
    return
  }

  const nextCount = current.count + 1
  const blockedUntil = nextCount >= MAX_ATTEMPTS ? now + BLOCK_MS : 0

  loginAttempts.set(key, {
    count: nextCount,
    windowStartedAt: current.windowStartedAt,
    blockedUntil,
  })
}

function clearAttempts(key: string) {
  loginAttempts.delete(key)
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Formato de credenciales inválido" }, { status: 400 })
    }

    const normalizedUsername = username.trim()
    const normalizedPassword = password.trim()
    const attemptKey = getAttemptKey(request, normalizedUsername)

    if (isBlocked(attemptKey)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta nuevamente en unos minutos." },
        { status: 429 }
      )
    }
    
    const isValid = validateAdminCredentials(normalizedUsername, normalizedPassword)

    if (!isValid) {
      registerFailedAttempt(attemptKey)
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 })
    }

    clearAttempts(attemptKey)
    const token = createSessionToken(normalizedUsername)
    const response = NextResponse.json({
        success: true,
        user: { username: normalizedUsername },
      })

    response.headers.set("Cache-Control", "no-store")
    setAdminSessionCookie(response, token)
    return response
  } catch (error) {
    console.error("Auth login error:", error)
    return NextResponse.json(
      { error: "Error en autenticación" },
      { status: 500 }
    )
  }
}
