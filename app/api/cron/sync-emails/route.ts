import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Call the bulk sync API
    const syncResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/emails/sync-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResponse.statusText}`)
    }

    const result = await syncResponse.json()

    console.log("Scheduled email sync completed:", result)

    return NextResponse.json({
      success: true,
      message: "Email sync completed",
      ...result,
    })
  } catch (error) {
    console.error("Cron sync error:", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
