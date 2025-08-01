import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Get all active user accounts
    const { data: accounts, error } = await supabase.from("user_accounts").select("*").eq("is_primary", true) // Only sync primary accounts to avoid rate limits

    if (error) {
      throw error
    }

    let totalProcessed = 0
    let totalNewEmails = 0
    const results = []

    for (const account of accounts || []) {
      try {
        // Call the import API for each account
        const importResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/emails/import`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: account.id,
            userId: account.user_id,
          }),
        })

        if (importResponse.ok) {
          const result = await importResponse.json()
          totalProcessed += result.processed || 0
          totalNewEmails += result.newEmails || 0
          results.push({
            accountId: account.id,
            email: account.email,
            success: true,
            ...result,
          })
        } else {
          results.push({
            accountId: account.id,
            email: account.email,
            success: false,
            error: "Import failed",
          })
        }
      } catch (error) {
        console.error(`Error syncing account ${account.id}:`, error)
        results.push({
          accountId: account.id,
          email: account.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalAccounts: accounts?.length || 0,
      totalProcessed,
      totalNewEmails,
      results,
    })
  } catch (error) {
    console.error("Bulk sync error:", error)
    return NextResponse.json({ error: "Failed to sync emails" }, { status: 500 })
  }
}
