import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

type SessionPayload = {
  username: string
  iat: number
  exp: number
}

export const ADMIN_SESSION_COOKIE = "admin_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 8

let warnedInsecureDevSecret = false

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8")
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET

  if (secret && secret.length >= 32) {
    return secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET must be configured in production with at least 32 characters")
  }

  if (!warnedInsecureDevSecret) {
    console.warn("Using insecure development session secret. Configure ADMIN_SESSION_SECRET for production.")
    warnedInsecureDevSecret = true
  }

  return "insecure-dev-session-secret-change-me"
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url")
}

export function createSessionToken(username: string) {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    username,
    iat: now,
    exp: now + SESSION_DURATION_SECONDS,
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null
  }

  const [encodedPayload, incomingSignature] = token.split(".")
  if (!encodedPayload || !incomingSignature) {
    return null
  }

  const expectedSignature = signPayload(encodedPayload)
  if (!safeEqual(incomingSignature, expectedSignature)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload
    const now = Math.floor(Date.now() / 1000)

    if (!payload.username || payload.exp <= now) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  })
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })
}

export function getAdminSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  return verifySessionToken(token)
}

export function ensureAdminSession(request: NextRequest) {
  const session = getAdminSession(request)

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  return null
}

export function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (username && password) {
    return { username, password }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be configured in production")
  }

  return {
    username: "admin",
    password: "cerouno2026",
  }
}

export function validateAdminCredentials(username: string, password: string) {
  const credentials = getAdminCredentials()
  return safeEqual(username, credentials.username) && safeEqual(password, credentials.password)
}

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown"
  }

  return request.headers.get("x-real-ip") ?? "unknown"
}
