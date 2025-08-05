import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { importEmailsForAccount } from "@/lib/emailSync"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: accounts, error } = await supabase
    .from("user_accounts")
    .select("id, user_id, email, access_token, refresh_token")


  if (error) {
    console.error("Failed to fetch accounts", error)
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
  }

  let totalImported = 0
  let totalProcessed = 0

  for (const account of accounts || []) {
    try {
      const result = await importEmailsForAccount({
        account,
        userId: account.user_id,
        isScheduled: true,
      })

      totalImported += result.imported
      totalProcessed += result.processed
    } catch (err) {
      console.error(`Error syncing account ${account.email}:`, err)
    }
  }

  return NextResponse.json({
    success: true,
    totalImported,
    totalProcessed,
    message: `Sync completed: ${totalImported} emails imported from ${accounts?.length || 0} accounts`,
    accounts
  })
}
