import { NextResponse } from "next/server"
import { collections } from "@/lib/db"
import { getSession, hashPassword, requireRole, toObjectId } from "@/lib/auth-server"

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const { params } = await Promise.resolve(ctx)
  const token = await getSession()
  requireRole(token, ["admin"])
  const { password, name, code, description, active, username } = await req.json()
  const _id = toObjectId(params.id)
  if (!_id) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const update: any = {}
  if (password) update.passwordHash = await hashPassword(password)
  if (typeof name !== "undefined") update.name = name
  if (typeof code !== "undefined") update.code = code
  if (typeof description !== "undefined") update.description = description
  if (typeof active !== "undefined") update.active = !!active
  if (typeof username !== 'undefined') update.username = username

  const { departments, users } = await collections()
  if (typeof username !== 'undefined') {
    const exists = await departments.findOne({ username, _id: { $ne: _id } })
    if (exists) return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
  }
  await departments.updateOne({ _id }, { $set: update })

  if (password) {
    // mirror to users
  await users.updateOne({ departmentId: _id, role: "department" }, { $set: { passwordHash: update.passwordHash, demoPassword: password } })
  // keep plaintext demoPassword for admin viewing (non-production practice)
  await departments.updateOne({ _id }, { $set: { demoPassword: password } })
  }
  if (typeof username !== 'undefined') {
    await users.updateOne({ departmentId: _id, role: 'department' }, { $set: { username } })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { params } = await Promise.resolve(ctx)
  const token = await getSession()
  requireRole(token, ["admin"])
  const _id = toObjectId(params.id)
  if (!_id) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const { departments, users } = await collections()
  await departments.updateOne({ _id }, { $set: { active: false } })
  await users.updateOne({ departmentId: _id, role: "department" }, { $set: { active: false } })
  return NextResponse.json({ ok: true })
}
