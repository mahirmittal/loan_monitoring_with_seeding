// Usage:
//   node scripts/seed-demo.mjs
// Requirements:
//   - .env.local (or env) with MONGODB_URI set
//   - Optional: JWT_SECRET not used here, only DB access is required
// Notes:
//   - Safe to re-run: uses upserts for users/departments/banks/branches (by unique keys)
//   - Passwords are hashed with bcryptjs

import dotenv from 'dotenv'
import { MongoClient, ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('Missing MONGODB_URI. Set it in .env.local or environment variables.')
  process.exit(1)
}

const client = new MongoClient(uri)

async function ensureIndexes(db) {
  // Users
  await db.collection('users').createIndex({ username: 1 }, { unique: true })
  await db.collection('users').createIndex({ role: 1 })
  await db.collection('users').createIndex({ departmentId: 1 })
  await db.collection('users').createIndex({ branchId: 1 })

  // Departments
  await db.collection('departments').createIndex({ name: 1 }, { unique: true })
  await db.collection('departments').createIndex({ active: 1 })

  // Banks
  await db.collection('banks').createIndex({ name: 1 }, { unique: true })
  await db.collection('banks').createIndex({ active: 1 })

  // Branches
  await db.collection('branches').createIndex({ bankId: 1, name: 1 }, { unique: true })
  await db.collection('branches').createIndex({ active: 1 })

  // Applications
  await db.collection('applications').createIndex({ branchId: 1 })
  await db.collection('applications').createIndex({ departmentId: 1 })
  await db.collection('applications').createIndex({ status: 1, createdAt: 1 })
}

function hash(password) {
  const salt = bcrypt.genSaltSync(10)
  return bcrypt.hashSync(password, salt)
}

async function upsertUser(db, { username, password, role, departmentId = null, branchId = null, active = true }) {
  const passwordHash = hash(password)
  const update = {
    $setOnInsert: { createdAt: new Date() },
    $set: { 
      passwordHash, 
      role, 
      departmentId, 
      branchId, 
      active, 
      updatedAt: new Date(),
      // Store demo password for admin viewing (NOT for production)
      demoPassword: password
    },
  }
  await db.collection('users').updateOne({ username }, update, { upsert: true })
}

async function upsertDepartment(db, name, creds) {
  const departments = db.collection('departments')
  const existing = await departments.findOne({ name })
  let departmentId
  if (existing) {
    departmentId = existing._id
    await departments.updateOne({ 
      _id: existing._id 
    }, { 
      $set: { 
        active: true, 
        updatedAt: new Date(),
        username: creds.username,
        passwordHash: hash(creds.password),
        demoPassword: creds.password
      } 
    })
  } else {
    const res = await departments.insertOne({ 
      name, 
      username: creds.username,
      passwordHash: hash(creds.password),
      demoPassword: creds.password,
      active: true, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    })
    departmentId = res.insertedId
  }
  await upsertUser(db, { username: creds.username, password: creds.password, role: 'department', departmentId })
  return { departmentId }
}

async function upsertBank(db, name) {
  const banks = db.collection('banks')
  const existing = await banks.findOne({ name })
  if (existing) {
    await banks.updateOne({ _id: existing._id }, { $set: { active: true, updatedAt: new Date() } })
    return existing._id
  }
  const res = await banks.insertOne({ name, active: true, createdAt: new Date(), updatedAt: new Date() })
  return res.insertedId
}

async function upsertBranch(db, bankId, name, creds) {
  const branches = db.collection('branches')
  const existing = await branches.findOne({ bankId: new ObjectId(bankId), name })
  let branchId
  if (existing) {
    branchId = existing._id
    await branches.updateOne({ 
      _id: existing._id 
    }, { 
      $set: { 
        active: true, 
        updatedAt: new Date(),
        username: creds?.username,
        passwordHash: creds ? hash(creds.password) : undefined,
        demoPassword: creds?.password
      } 
    })
  } else {
    const res = await branches.insertOne({
      bankId: new ObjectId(bankId),
      name,
      username: creds?.username,
      passwordHash: creds ? hash(creds.password) : undefined,
      demoPassword: creds?.password,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    branchId = res.insertedId
  }
  if (creds) {
    await upsertUser(db, { username: creds.username, password: creds.password, role: 'branch', branchId })
  }
  return { branchId }
}

async function seedApplications(db, { departmentId, branchId }) {
  const apps = db.collection('applications')
  const seed = [
    {
      loanType: 'individual',
      applicantName: 'Ravi Kumar',
      address: 'Ward 12, Raipur',
      bankBranch: 'SBI - Raipur Main',
      description: 'Working capital for small dairy business',
      departmentId,
      branchId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      loanType: 'shg',
      applicantName: 'Ujjwal SHG',
      address: 'Village Borgaon, Bilaspur',
      bankBranch: 'HDFC - Bilaspur Civil Lines',
      description: 'SHG revolving fund',
      departmentId,
      branchId,
      status: 'approved',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      updatedAt: new Date(),
    },
    {
      loanType: 'individual',
      applicantName: 'Sita Verma',
      address: 'Sector 5, Bhilai',
      bankBranch: 'PNB - Bhilai Power House',
      description: 'Sewing machine for tailoring work',
      departmentId,
      branchId,
      status: 'rejected',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
      updatedAt: new Date(),
    },
    {
      loanType: 'individual',
      applicantName: 'Mahadev Sahu',
      address: 'Dhamtari',
      bankBranch: 'SBI - Raipur Main',
      description: 'Irrigation pump for 2-acre farm',
      departmentId,
      branchId,
      status: 'disbursed',
      disbursedAt: new Date(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
      updatedAt: new Date(),
    },
  ]
  await apps.insertMany(seed)
}

async function main() {
  await client.connect()
  const dbNameFromUri = uri.split('/').pop()?.split('?')[0]
  const db = client.db(dbNameFromUri)

  await ensureIndexes(db)

  // 1) Admin
  const adminUsername = 'admin'
  const adminPassword = 'Admin@12345'
  await upsertUser(db, { username: adminUsername, password: adminPassword, role: 'admin' })

  // 2) Departments (with credentials)
  const departmentsSeed = [
    { name: 'Agriculture', username: 'dept_agri', password: 'Agri@12345' },
    { name: 'Health', username: 'dept_health', password: 'Health@12345' },
    { name: 'Education', username: 'dept_edu', password: 'Edu@12345' },
  ]
  const deptResults = []
  for (const d of departmentsSeed) {
    const { departmentId } = await upsertDepartment(db, d.name, { username: d.username, password: d.password })
    deptResults.push({ ...d, departmentId })
  }

  // 3) Banks and Branches (with branch credentials)
  const banksSeed = [
    {
      bank: 'State Bank of India',
      branches: [
        { name: 'Raipur Main', username: 'sbi_raipur', password: 'Branch@12345' },
        { name: 'Bhilai Power House', username: 'sbi_bhilai', password: 'Branch@12345' },
      ],
    },
    {
      bank: 'HDFC Bank',
      branches: [
        { name: 'Bilaspur Civil Lines', username: 'hdfc_bilaspur', password: 'Branch@12345' },
      ],
    },
    {
      bank: 'Punjab National Bank',
      branches: [
        { name: 'Raipur Pandri', username: 'pnb_pandri', password: 'Branch@12345' },
      ],
    },
  ]

  const branchResults = []
  for (const b of banksSeed) {
    const bankId = await upsertBank(db, b.bank)
    for (const br of b.branches) {
      const { branchId } = await upsertBranch(db, bankId, br.name, { username: br.username, password: br.password })
      branchResults.push({ bank: b.bank, branch: br.name, username: br.username, password: br.password, branchId })
    }
  }

  // 4) Applications (use first department + first branch for demo)
  if (deptResults.length > 0 && branchResults.length > 0) {
    await seedApplications(db, {
      departmentId: deptResults[0].departmentId,
      branchId: branchResults[0].branchId,
    })
  }

  // Print credentials summary
  /* eslint-disable no-console */
  console.log('--- Demo Credentials ---')
  console.log(`Admin → ${adminUsername} / ${adminPassword}`)
  console.log('Departments:')
  deptResults.forEach((d) => console.log(`  ${d.name} → ${d.username} / ${d.password}`))
  console.log('Branches:')
  branchResults.forEach((b) =>
    console.log(`  ${b.bank} - ${b.branch} → ${b.username} / ${b.password}`)
  )
  console.log('------------------------')

  await client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
