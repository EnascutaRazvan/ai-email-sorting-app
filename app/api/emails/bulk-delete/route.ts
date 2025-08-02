import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "Invalid email IDs" }, { status: 400 })
    }

    // Delete emails that belong to the user's accounts
    const placeholders = emailIds.map((_, index) => `$${index + 2}`).join(",")
    const result = await sql`
      DELETE FROM emails 
      WHERE id IN (${emailIds.join(",")})
      AND account_id IN (
        SELECT id FROM accounts WHERE user_email = ${session.user.email}
      )
    `

    return NextResponse.json({
      success: true,
      deletedCount: result.length || emailIds.length,
    })
  } catch (error) {
    console.error("Error deleting emails:", error)
    return NextResponse.json({ error: "Failed to delete emails" }, { status: 500 })
  }
}
