import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"
import { importEmailsForAccount } from "@/lib/emailSync"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accountId, isScheduled = false } = await request.json()

  const { data: account, error: accountError } = await supabase
    .from("user_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", session.user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", session.user.id)

  const result = await importEmailsForAccount({
    account,
    userId: session.user.id,
    isScheduled,
    categories: categories || [],
  })

  return NextResponse.json({
    success: true,
    ...result,
    message: `Successfully imported ${result.imported} new emails out of ${result.processed} processed`,
  })
}
