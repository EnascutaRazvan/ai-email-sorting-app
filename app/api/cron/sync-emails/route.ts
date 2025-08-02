import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Call the sync-all endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/emails/sync-all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
    })

    const data = await response.json()

    if (data.success) {
      console.log(`Cron job completed: ${data.totalImported} emails imported`)
      return NextResponse.json({
        success: true,
        message: data.message,
        imported: data.totalImported,
      })
    } else {
      console.error("Cron job failed:", data.error)
      return NextResponse.json({ error: data.error }, { status: 500 })
    }
  } catch (error) {
    console.error("Cron job error:", error)
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 })
  }
}
