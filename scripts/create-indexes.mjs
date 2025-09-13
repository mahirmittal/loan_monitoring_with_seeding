// Usage: node scripts/create-indexes.mjs  (MONGODB_URI must be set)
import { MongoClient } from "mongodb"

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("[create-indexes] MONGODB_URI is not set. Add it to .env.local or Project Settings.")
    process.exit(1)
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db()

    const users = db.collection("users")
    const departments = db.collection("departments")
    const banks = db.collection("banks")
    const branches = db.collection("branches")
    const applications = db.collection("applications")

    // Users
    await users.createIndex({ username: 1 }, { unique: true })

    // Departments
    await departments.createIndex({ username: 1 }, { unique: true })
    await departments.createIndex({ name: 1 }, { unique: true })

    // Banks and branches
    await banks.createIndex({ name: 1 }, { unique: true })
    await branches.createIndex({ bankId: 1, name: 1 }, { unique: true })
    await branches.createIndex({ bankId: 1 })
    await branches.createIndex({ active: 1 })

    // Applications
    await applications.createIndex({ departmentId: 1 })
    await applications.createIndex({ branchId: 1 })
    await applications.createIndex({ status: 1, createdAt: 1 })

    console.log("[create-indexes] Indexes created successfully.")
  } catch (err) {
    console.error("[create-indexes] Error:", err?.message || err)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()
