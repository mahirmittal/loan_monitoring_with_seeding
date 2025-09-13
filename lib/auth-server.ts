import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"
import { collections } from "./db"

const COOKIE_NAME = "auth_token"
const DAY = 24 * 60 * 60

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("Missing JWT_SECRET env var. Set it in Project Settings.")
  return new TextEncoder().encode(secret)
}

export type UserToken = {
  sub: string
  role: "admin" | "department" | "branch"
  departmentId?: string
  branchId?: string
  username: string
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(payload: UserToken, remember = false) {
  const secret = getJwtSecret()
  const expSeconds = remember ? 30 * DAY : 12 * 60 * 60 // 30d or 12h
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expSeconds,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 })
}

export async function getSession(): Promise<UserToken | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const secret = getJwtSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as UserToken
  } catch {
    return null
  }
}

// Find a user based on role + username
export async function findUser(role: "admin" | "department" | "branch", username: string) {
  const { users, departments, branches } = await collections()
  console.log('DEBUG - findUser called with:', { role, username })
  
  if (role === "admin") {
    const adminUser = await users.findOne({ username, role: "admin", active: { $ne: false } })
    console.log('DEBUG - Admin user lookup result:', adminUser ? { _id: adminUser._id, username: adminUser.username, role: adminUser.role } : null)
    return adminUser
  }
  if (role === "department") {
    // departments with embedded credentials or mirrored in users
    const depUser = await users.findOne({ username, role: "department", active: { $ne: false } })
    if (depUser) return depUser
    const dep = await departments.findOne({ username, active: { $ne: false } })
    if (!dep) return null
    return {
      _id: dep._id,
      username: dep.username,
      passwordHash: dep.passwordHash,
      role: "department",
      departmentId: dep._id.toString(),
      active: dep.active !== false,
    }
  }
  if (role === "branch") {
    const brUser = await users.findOne({ username, role: "branch", active: { $ne: false } })
    if (brUser) return brUser
    const br = await branches.findOne({ username, active: { $ne: false } })
    if (!br) return null
    return {
      _id: br._id,
      username: br.username,
      passwordHash: br.passwordHash,
      role: "branch",
      branchId: br._id.toString(),
      active: br.active !== false,
    }
  }
  return null
}

export function requireRole(token: UserToken | null, roles: UserToken["role"][]) {
  console.log('DEBUG - requireRole called with:', {
    token: token ? { role: token.role, username: token.username } : null,
    requiredRoles: roles
  })
  if (!token || !roles.includes(token.role)) {
    console.log('DEBUG - Authorization failed:', {
      hasToken: !!token,
      tokenRole: token?.role,
      requiredRoles: roles,
      roleIncluded: token ? roles.includes(token.role) : false
    })
    const err: any = new Error("Unauthorized")
    err.status = 401
    throw err
  }
}

export function toObjectId(id?: string) {
  return id ? new ObjectId(id) : undefined
}

export function ensureObjectId(id?: string | ObjectId | any) {
  if (!id) return null
  
  // Handle the case where id is already an ObjectId
  if (id instanceof ObjectId) return id
  
  // Handle string conversion
  if (typeof id === 'string') return new ObjectId(id)
  
  // Handle the case where id has a buffer property (from JWT deserialization)
  if (id.buffer) {
    const bufferArray = Object.values(id.buffer) as number[]
    return new ObjectId(Buffer.from(bufferArray))
  }
  
  // Handle other ObjectId-like objects
  if (id._id) return new ObjectId(id._id)
  if (id.$oid) return new ObjectId(id.$oid)
  
  // Convert to string as fallback
  return new ObjectId(id.toString())
}
