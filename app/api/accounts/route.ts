import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route" // Import authOptions

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
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

    // Add token status information
    const enhancedAccounts = accounts.map((account) => ({
      ...account,
      token_status: getTokenStatus(account.token_expires_at),
      permissions: parseScopes(account.scope),
    }))

    return NextResponse.json({
      accounts: enhancedAccounts,
      total: accounts.length,
      primary: accounts.find((acc) => acc.is_primary)?.email,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getTokenStatus(expiresAt: string | null): "valid" | "expiring_soon" | "expired" | "never" {
  if (!expiresAt) return "never"

  const expiry = new Date(expiresAt).getTime()
  const now = Date.now()
  const oneHour = 60 * 60 * 1000

  if (expiry < now) return "expired"
  if (expiry - now < oneHour) return "expiring_soon"
  return "valid"
}

function parseScopes(scope: string | null): string[] {
  if (!scope) return []
  return scope.split(" ").filter(Boolean)
}
