import { MongoClient, type Db } from "mongodb"

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!process.env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI env var. Set it in Project Settings.")
}

const uri = process.env.MONGODB_URI
const options = {}

if (process.env.NODE_ENV === "development") {
  if (!global.__mongoClientPromise) {
    client = new MongoClient(uri!, options)
    global.__mongoClientPromise = client.connect()
  }
  clientPromise = global.__mongoClientPromise!
} else {
  client = new MongoClient(uri!, options)
  clientPromise = client.connect()
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise
  return client.db() // default database from connection string
}

// Collections helper (keeps names consistent)
export async function collections() {
  const db = await getDb()
  return {
    users: db.collection("users"), // { _id, username, passwordHash, role, departmentId?, branchId?, active }
    departments: db.collection("departments"), // { _id, name, username, passwordHash, active }
    banks: db.collection("banks"), // { _id, name, code, active }
    branches: db.collection("branches"), // { _id, bankId, name, code, username, passwordHash, active }
    applications: db.collection("applications"), // { _id, type, applicantName, address, bankId, branchId, departmentId, description, status, history[], createdAt }
    auditLogs: db.collection("auditLogs"), // optional
  }
}
