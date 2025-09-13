import { NextResponse } from "next/server"
import { collections } from "@/lib/db"
import { getSession, requireRole, toObjectId } from "@/lib/auth-server"

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { params } = await Promise.resolve(ctx)
  const token = await getSession()
  requireRole(token, ["admin"])
  const _id = toObjectId(params.id)
  if (!_id) return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  const { branches, users } = await collections()
  await branches.updateOne({ _id }, { $set: { active: false } })
  await users.updateOne({ branchId: _id, role: "branch" }, { $set: { active: false } })
  return NextResponse.json({ ok: true })
}
