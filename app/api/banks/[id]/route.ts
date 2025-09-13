import { NextResponse } from "next/server"
import { collections } from "@/lib/db"
import { getSession, requireRole, toObjectId } from "@/lib/auth-server"

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  // Await params per Next.js dynamic route recommendation
  const { params } = await Promise.resolve(ctx)
  const token = await getSession()
  requireRole(token, ["admin"])
  const _id = toObjectId(params.id)
  if (!_id) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const { banks, branches, users } = await collections()

  // Soft-delete bank
  await banks.updateOne({ _id }, { $set: { active: false } })

  const affected = await branches.find({ bankId: _id }, { projection: { _id: 1 } }).toArray()
  if (affected.length > 0) {
    const branchIds = affected.map((b) => b._id)
    await branches.updateMany({ _id: { $in: branchIds } }, { $set: { active: false } })
    await users.updateMany({ role: "branch", branchId: { $in: branchIds } }, { $set: { active: false } })
  }

  return NextResponse.json({ ok: true })
}
