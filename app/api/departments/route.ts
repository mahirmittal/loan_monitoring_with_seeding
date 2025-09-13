import { NextResponse } from "next/server"
import { collections } from "@/lib/db"
import { getSession, hashPassword, requireRole } from "@/lib/auth-server"
import { ObjectId } from "mongodb"

export async function GET() {
  const token = await getSession()
  const { departments } = await collections()
  
  // Admin users can see passwords, others cannot
  const projection = token?.role === "admin" ? {} : { passwordHash: 0 }
  const list = await departments
    .find({ active: { $ne: false } }, { projection })
    .sort({ name: 1 })
    .toArray()
  return NextResponse.json({ departments: list })
}

export async function POST(req: Request) {
  const token = await getSession()
  console.log('DEBUG - Token in departments POST:', JSON.stringify(token, null, 2))
  console.log('DEBUG - Token role:', token?.role)
  console.log('DEBUG - Required roles:', ["admin"])
  requireRole(token, ["admin"])
  const { name, username, password, code, description } = await req.json()
  if (!name || !username || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const { departments, users } = await collections()
  const exists = await departments.findOne({ $or: [{ name }, { username }] })
  if (exists) return NextResponse.json({ error: "Department or username exists" }, { status: 409 })
  const passwordHash = await hashPassword(password)
  const now = new Date()
  const res = await departments.insertOne({
    name,
    username,
    passwordHash,
    demoPassword: password, // Store for admin viewing
    code: code || null,
    description: description || null,
    createdAt: now,
  })
  await users.insertOne({
    username,
    role: "department",
    passwordHash,
    demoPassword: password, // Store for admin viewing
    departmentId: res.insertedId,
    active: true,
    createdAt: now,
  })
  return NextResponse.json({ ok: true, id: res.insertedId })
}

export async function PATCH(req: Request) {
  const token = await getSession()
  requireRole(token, ["admin"])
  const { departmentId, username, password } = await req.json()
  if (!departmentId || !username || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }
  const { departments, users } = await collections()
  const _id = new ObjectId(departmentId)

  // Check if new username conflicts with other departments
  const exists = await departments.findOne({ username, _id: { $ne: _id } })
  if (exists) return NextResponse.json({ error: "Username already exists" }, { status: 409 })

  const passwordHash = await hashPassword(password)
  
  // Update department credentials
  await departments.updateOne(
    { _id },
    { $set: { username, passwordHash, demoPassword: password } }
  )
  
  // Update user credentials
  await users.updateOne(
    { departmentId: _id },
    { $set: { username, passwordHash, demoPassword: password } }
  )
  
  return NextResponse.json({ ok: true })
}
