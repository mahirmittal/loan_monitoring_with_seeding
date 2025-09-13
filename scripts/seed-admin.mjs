// Usage:
//  - Env: MONGODB_URI must be set
//  - Run: node scripts/seed-admin.mjs --username admin --password "StrongPass!23" [--reset]
//  - Or: ADMIN_USERNAME, ADMIN_PASSWORD env vars
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

function getArg(flag) {
  const idx = process.argv.findIndex((a) => a === `--${flag}` || a.startsWith(`--${flag}=`))
  if (idx === -1) return undefined
  const exact = process.argv[idx]
  if (exact.includes("=")) return exact.split("=")[1]
  const next = process.argv[idx + 1]
  if (next && !next.startsWith("--")) return next
  return true // flags like --reset
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("[seed-admin] MONGODB_URI is not set. Add it to .env.local or Project Settings.")
    process.exit(1)
  }

  const username = process.env.ADMIN_USERNAME || getArg("username")
  const password = process.env.ADMIN_PASSWORD || getArg("password")
  const reset = !!getArg("reset")

  if (!username || !password) {
    console.error("[seed-admin] Missing --username or --password (or env ADMIN_USERNAME/ADMIN_PASSWORD).")
    process.exit(1)
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db() // uses DB name from URI
    const users = db.collection("users")

    // Ensure unique index on username
    await users.createIndex({ username: 1 }, { unique: true })

    const passwordHash = bcrypt.hashSync(String(password), 12)

    const existing = await users.findOne({ username })
    if (existing && !reset) {
      console.log(`[seed-admin] User "${username}" already exists. Use --reset to update its password.`)
      process.exit(0)
    }

    const now = new Date()
    const doc = {
      username: String(username),
      passwordHash,
      role: "admin",
      active: true,
      updatedAt: now,
      ...(existing
        ? {}
        : {
            createdAt: now,
          }),
    }

    if (existing) {
      await users.updateOne({ _id: existing._id }, { $set: doc })
      console.log(`[seed-admin] Updated password for existing admin "${username}".`)
    } else {
      await users.insertOne(doc)
      console.log(`[seed-admin] Created admin "${username}".`)
    }

    console.log("[seed-admin] Done.")
  } catch (err) {
    console.error("[seed-admin] Error:", err?.message || err)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()
