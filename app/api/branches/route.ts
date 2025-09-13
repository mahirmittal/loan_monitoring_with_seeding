import { NextResponse } from "next/server"
import { collections } from "@/lib/db"
import { getSession, hashPassword, requireRole } from "@/lib/auth-server"
import { ObjectId } from "mongodb"

export async function GET(req: Request) {
  const token = await getSession()
  const url = new URL(req.url)
  const bankId = url.searchParams.get("bankId")
  const { branches } = await collections()
  const filter: any = { active: { $ne: false } }
  if (bankId) filter.bankId = new ObjectId(bankId)
  
  // Admin users can see passwords, others cannot
  const projection = token?.role === "admin" ? {} : { passwordHash: 0 }
  const list = await branches.find(filter, { projection }).toArray()
  
  return NextResponse.json({ branches: list })
}

export async function POST(req: Request) {
  const token = await getSession()
  requireRole(token, ["admin"])
  const { bankId, name, code, username, password } = await req.json()
  if (!bankId || !name || !username || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const { branches, users } = await collections()

  // Uniqueness checks: username is always unique; code only checked if provided
  const orClauses = [{ username }]
  if (code) orClauses.push({ code })
  const exists = await branches.findOne({ $or: orClauses })
  if (exists) return NextResponse.json({ error: "Branch username/code already exists" }, { status: 409 })

  const passwordHash = await hashPassword(password)
  const res = await branches.insertOne({
    bankId: new ObjectId(bankId),
    name,
    code: code || null,
    username,
    passwordHash,
    demoPassword: password, // Store for admin viewing
    active: true,
  })
  await users.insertOne({
    username,
    role: "branch",
    passwordHash,
    demoPassword: password, // Store for admin viewing
    branchId: res.insertedId,
    active: true,
  })
  return NextResponse.json({ ok: true, id: res.insertedId })
}

export async function PATCH(req: Request) {
  const token = await getSession()
  requireRole(token, ["admin"])
  const { branchId, username, password } = await req.json()
  if (!branchId || !username || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const { branches, users } = await collections()
  const _id = new ObjectId(branchId)

  // Check if new username conflicts with other branches
  const exists = await branches.findOne({ username, _id: { $ne: _id } })
  if (exists) return NextResponse.json({ error: "Username already exists" }, { status: 409 })

  const passwordHash = await hashPassword(password)
  
  // Update branch credentials
  await branches.updateOne(
    { _id },
    { $set: { username, passwordHash, demoPassword: password } }
  )
  
  // Update user credentials
  await users.updateOne(
    { branchId: _id },
    { $set: { username, passwordHash, demoPassword: password } }
  )
  
  return NextResponse.json({ ok: true })
}
