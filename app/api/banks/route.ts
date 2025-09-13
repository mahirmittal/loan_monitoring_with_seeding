import { NextResponse } from "next/server"
import { collections } from "@/lib/db"
import { getSession, requireRole } from "@/lib/auth-server"

export async function GET() {
  const { banks } = await collections()
  const list = await banks.find({ active: { $ne: false } }).toArray()
  return NextResponse.json({ banks: list })
}

export async function POST(req: Request) {
  const token = await getSession()
  requireRole(token, ["admin"])
  const body = await req.json()
  let { name, code } = body || {}
  name = typeof name === 'string' ? name.trim() : ''
  code = typeof code === 'string' ? code.trim() : undefined
  if (!name) return NextResponse.json({ error: "Bank name is required" }, { status: 400 })
  const { banks } = await collections()
  // Build uniqueness filter dynamically
  const or: any[] = [{ name }]
  if (code) or.push({ code })
  const exists = await banks.findOne({ $or: or })
  if (exists) return NextResponse.json({ error: "Bank with same name/code already exists" }, { status: 409 })
  const doc: any = { name, active: true }
  if (code) doc.code = code
  const res = await banks.insertOne(doc)
  return NextResponse.json({ ok: true, id: res.insertedId })
}
