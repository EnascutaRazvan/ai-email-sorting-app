import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all active accounts for the user
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)

    if (accountsError) {
      throw new Error("Failed to fetch user accounts")
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active accounts to sync",
        results: [],
      })
    }

    const results = []

    // Sync each account
    for (const account of accounts) {
      try {
        const importResponse = await fetch(`${request.nextUrl.origin}/api/emails/import`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ accountId: account.id }),
        })

        const importResult = await importResponse.json()

        results.push({
          accountId: account.id,
          email: account.email,
          success: importResult.success,
          imported: importResult.imported || 0,
          message: importResult.message,
          errors: importResult.errors,
        })
      } catch (error) {
        console.error(`Error syncing account ${account.email}:`, error)
        results.push({
          accountId: account.id,
          email: account.email,
          success: false,
          imported: 0,
          message: `Failed to sync: ${error.message}`,
        })
      }
    }

    const totalImported = results.reduce((sum, result) => sum + (result.imported || 0), 0)
    const successfulSyncs = results.filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      message: `Synced ${successfulSyncs}/${accounts.length} accounts, imported ${totalImported} emails`,
      totalImported,
      results,
    })
  } catch (error) {
    console.error("Sync all error:", error)
    return NextResponse.json({ error: "Failed to sync accounts" }, { status: 500 })
  }
}
