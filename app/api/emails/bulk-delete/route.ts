import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { neon } from "@neondatabase/serverless"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  try {
    const { emailIds } = await request.json()

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return new NextResponse("Invalid email IDs provided", { status: 400 })
    }

    // Ensure all email IDs belong to the current user
    const userEmails = await sql`
      SELECT id FROM emails WHERE id = ANY(${emailIds}) AND user_id = ${session.user.id}
    `
    const validEmailIds = userEmails.map((email: any) => email.id)

    if (validEmailIds.length === 0) {
      return new NextResponse("No valid emails found for deletion or unauthorized access", { status: 403 })
    }

    await sql`
      DELETE FROM emails WHERE id = ANY(${validEmailIds}) AND user_id = ${session.user.id}
    `

    return NextResponse.json({ message: "Emails deleted successfully", deletedCount: validEmailIds.length })
  } catch (error) {
    console.error("Error deleting emails:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
