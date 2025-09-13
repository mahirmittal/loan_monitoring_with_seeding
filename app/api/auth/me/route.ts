import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-server"

export async function GET() {
  const token = await getSession()
  console.log('DEBUG - /api/auth/me token:', JSON.stringify(token, null, 2))
  if (!token) return NextResponse.json({ user: null })
  return NextResponse.json({ user: token })
}
