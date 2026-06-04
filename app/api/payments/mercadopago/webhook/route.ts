import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  return NextResponse.json(
    {
      ok: true,
      topic: searchParams.get("topic"),
      id: searchParams.get("id"),
      resource: searchParams.get("resource"),
    },
    { status: 200 }
  )
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    return NextResponse.json(
      {
        received: true,
        type: payload?.type || null,
        action: payload?.action || null,
        data: payload?.data || null,
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      { received: false, error: "Webhook payload invalido" },
      { status: 400 }
    )
  }
}
