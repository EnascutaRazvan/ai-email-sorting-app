import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a cron job or authorized source
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all active user accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("id, user_id, email, access_token")
      .eq("is_primary", true) // Only sync primary accounts to avoid duplicates

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    let totalImported = 0
    let totalProcessed = 0
    const results = []

    for (const account of accounts || []) {
      try {
        // Call the import API for each account
        const importResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/emails/import`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
          body: JSON.stringify({
            accountId: account.id,
            isScheduled: true,
            userId: account.user_id, // Pass user ID for scheduled imports
          }),
        })

        if (importResponse.ok) {
          const importData = await importResponse.json()
          totalImported += importData.imported || 0;
          totalProcessed += importData.processed || 0;

          results.push({
            accountId: account.id,
            email: account.email,
            imported: importData.imported,
            processed: importData.processed,
            success: true,
          })
        } else {
          results.push({
            accountId: account.id,
            email: account.email,
            error: "Import failed",
            success: false,
          })
        }
      } catch (error) {
        console.error(`Error syncing account ${account.email}:`, error)
        results.push({
          accountId: account.id,
          email: account.email,
          error: error.message,
          success: false,
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalImported,
      totalProcessed,
      accountsProcessed: accounts?.length || 0,
      results,
      message: `Sync completed: ${totalImported} emails imported from ${accounts?.length || 0} accounts`,
    })
  } catch (error) {
    console.error("Sync all error:", error)
    return NextResponse.json({ error: "Failed to sync emails" }, { status: 500 })
  }
}
