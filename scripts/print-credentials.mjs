// Usage:
//   node scripts/print-credentials.mjs
import 'dotenv/config'
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Missing MONGODB_URI. Set it in .env.local or environment variables.')
  process.exit(1)
}

const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const dbNameFromUri = uri.split('/').pop()?.split('?')[0]
  const db = client.db(dbNameFromUri)

  const users = await db
    .collection('users')
    .find({}, { projection: { username: 1, role: 1, departmentId: 1, branchId: 1 } })
    .toArray()

  console.log('--- Users (no passwords, hashed in DB) ---')
  users.forEach((u) => {
    console.log(JSON.stringify(u))
  })
  console.log('-----------------------------------------')

  await client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
