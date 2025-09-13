import { NextResponse } from "next/server"
import { createSession, findUser, verifyPassword } from "@/lib/auth-server"

export async function POST(req: Request) {
  try {
    const { role, username, password, remember } = await req.json()
    console.log('DEBUG - Login attempt:', { role, username, remember })
    if (!role || !username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }
    const user = await findUser(role, username)
    console.log('DEBUG - Found user:', user ? { _id: user._id, username: user.username, role: user.role } : null)
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
    const ok = await verifyPassword(password, user.passwordHash)
    console.log('DEBUG - Password verification:', ok)
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })

    const sessionPayload = {
      sub: user._id?.toString() || "",
      role,
      username,
      departmentId: (user as any).departmentId,
      branchId: (user as any).branchId,
    }
    console.log('DEBUG - Creating session with payload:', sessionPayload)

    await createSession(sessionPayload, !!remember)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('DEBUG - Login error:', e)
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 })
  }
}
