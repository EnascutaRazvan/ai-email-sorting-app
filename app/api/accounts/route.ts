import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: accounts, error } = await supabase
      .from("user_accounts")
      .select(`
        id,
        email,
        name,
        picture,
        is_primary,
        created_at,
        updated_at,
        token_expires_at,
        scope
      `)
      .eq("user_id", session.user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching accounts:", error)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    // Check for expiring tokens and flag them
    const accountsWithStatus = accounts.map((account) => ({
      ...account,
      token_status: getTokenStatus(account.token_expires_at),
    }))

    return NextResponse.json({
      accounts: accountsWithStatus,
      total: accounts.length,
      primary: accounts.find((acc) => acc.is_primary),
    })
  } catch (error) {
    console.error("Error in accounts API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getTokenStatus(expiresAt: string | null): "valid" | "expiring" | "expired" {
  if (!expiresAt) return "valid"

  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  const oneHour = 60 * 60 * 1000
  const oneDayFromNow = now + 24 * oneHour

  if (expiryTime < now) return "expired"
  if (expiryTime < oneDayFromNow) return "expiring"
  return "valid"
}
