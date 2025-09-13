import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

export async function GET() {
  const hasUri = !!process.env.MONGODB_URI
  const hasJwt = !!process.env.JWT_SECRET

  if (!hasUri || !hasJwt) {
    return NextResponse.json(
      {
        ok: false,
        env: {
          hasMONGODB_URI: hasUri,
          hasJWT_SECRET: hasJwt,
        },
        hint: "Ensure MONGODB_URI and JWT_SECRET are set in Project Settings. Preview must be refreshed/redeployed after adding.",
      },
      { status: 500 },
    )
  }

  // Try to ping MongoDB with a short timeout for quick feedback
  const client = new MongoClient(process.env.MONGODB_URI as string, {
    serverSelectionTimeoutMS: 5000,
    // retryWrites can be left default; TLS is inferred from the URI
  })

  try {
    // This triggers a connection and pings the server
    await client.db().command({ ping: 1 })

    return NextResponse.json({
      ok: true,
      env: {
        hasMONGODB_URI: true,
        hasJWT_SECRET: true,
      },
      db: "connected",
      hint: "If logins still fail, seed an initial admin and test /api/auth/login → /api/auth/me.",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        env: {
          hasMONGODB_URI: true,
          hasJWT_SECRET: true,
        },
        db: "unreachable",
        error: error?.message || "Unknown error",
        commonCauses: [
          "MongoDB Atlas Network Access: allow 0.0.0.0/0 temporarily (or add Vercel egress IPs)",
          "Wrong username/password or missing database name in the URI",
          "Project needs a fresh Preview reload after setting env vars",
        ],
      },
      { status: 500 },
    )
  } finally {
    try {
      await client.close()
    } catch {}
  }
}
