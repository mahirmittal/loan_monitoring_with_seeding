import { NextResponse } from "next/server"
import { collections } from "@/lib/db"
import { getSession, requireRole, ensureObjectId } from "@/lib/auth-server"
import { ObjectId } from "mongodb"

export async function GET(req: Request) {
  const token = await getSession()
  if (!token) return NextResponse.json({ applications: [] })
  const { applications } = await collections()
  const url = new URL(req.url)
  const status = url.searchParams.get("status") // optional filter

  const filter: any = {}
  if (status) filter.status = status

  if (token.role === "department" && token.departmentId) {
    filter.departmentId = ensureObjectId(token.departmentId)
  } else if (token.role === "branch" && token.branchId) {
    filter.branchId = ensureObjectId(token.branchId)
  }
  // admin sees all

  const list = await applications.find(filter).sort({ createdAt: -1 }).toArray()

  return NextResponse.json({ applications: list })
}

export async function POST(req: Request) {
  try {
    const token = await getSession()
    console.log('DEBUG - Token in applications POST:', JSON.stringify(token, null, 2))
    requireRole(token, ["department"])
    
    const { type, applicantName, address, bankId, branchId, description } = await req.json()
    if (!type || !applicantName || !address || !bankId || !branchId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }
    
    const { applications } = await collections()
    
    // Handle departmentId - it comes as a buffer object from JWT
    let deptId = null
    if (token!.departmentId) {
      if (token!.departmentId instanceof ObjectId) {
        deptId = token!.departmentId
      } else if (typeof token!.departmentId === 'string') {
        deptId = new ObjectId(token!.departmentId)
      } else if (token!.departmentId.buffer) {
        // Convert buffer back to ObjectId
        const bufferArray = Object.values(token!.departmentId.buffer) as number[]
        deptId = new ObjectId(Buffer.from(bufferArray))
      } else {
        deptId = new ObjectId(token!.departmentId.toString())
      }
    }
    
    const doc = {
      type,
      applicantName,
      address,
      bankId: new ObjectId(bankId),
      branchId: new ObjectId(branchId),
      departmentId: deptId,
      submittedBy: token!.role,
      submittedByUserId: token!.sub,
      description: description || "",
      status: "submitted",
      history: [{ at: new Date(), by: token!.username, action: "submitted" }],
      createdAt: new Date(),
    }
    
    const res = await applications.insertOne(doc)
    return NextResponse.json({ ok: true, id: res.insertedId })
  } catch (error) {
    console.error('Error in POST /api/applications:', error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const token = await getSession()
  const body = await req.json()
  const { id, action, reason, disbursementRef } = body
  if (!id || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const { applications } = await collections()
  const _id = new ObjectId(id)

  if (action === "approve" || action === "reject") {
    requireRole(token, ["admin"])
    const status = action === "approve" ? "approved" : "rejected"
    await applications.updateOne(
      { _id },
      {
        $set: { status },
        $push: { history: { at: new Date(), by: token!.username, action, reason: reason || "" } },
      },
    )
    return NextResponse.json({ ok: true })
  }

  if (action === "disburse") {
    requireRole(token, ["branch"])
    await applications.updateOne(
      { _id, status: "approved" },
      {
        $set: { status: "disbursed", disbursementRef: disbursementRef || null },
        $push: { history: { at: new Date(), by: token!.username, action, disbursementRef: disbursementRef || "" } },
      },
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
