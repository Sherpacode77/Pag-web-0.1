import { NextRequest, NextResponse } from "next/server"

// Credenciales de administrador (en producción, esto debería estar en variables de entorno y hasheado)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cerouno2026"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // En producción, usar JWT o sesiones reales
      const token = Buffer.from(`${username}:${Date.now()}`).toString("base64")
      
      return NextResponse.json({
        success: true,
        token,
        user: { username },
      })
    } else {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error en autenticación" },
      { status: 500 }
    )
  }
}
