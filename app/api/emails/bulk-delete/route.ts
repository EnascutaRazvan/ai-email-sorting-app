import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { neon } from "@neondatabase/serverless"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { emailIds } = await request.json()

  if (!Array.isArray(emailIds) || emailIds.length === 0) {
    return NextResponse.json({ message: "No email IDs provided" }, { status: 400 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  try {
    // Delete emails belonging to the current user
    const deletedEmails = await sql`
      DELETE FROM emails
      WHERE id IN (${sql(emailIds)}) AND user_id = ${session.user.id}
      RETURNING id;
    `

    return NextResponse.json({
      message: `Successfully deleted ${deletedEmails.length} emails.`,
      deletedCount: deletedEmails.length,
    })
  } catch (error) {
    console.error("Error deleting emails:", error)
    return NextResponse.json({ message: "Failed to delete emails", error: error.message }, { status: 500 })
  }
}
