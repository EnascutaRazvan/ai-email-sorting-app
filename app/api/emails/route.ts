import { createRouter } from "next-connect"
import type { NextApiRequest, NextApiResponse } from "next"
import { supabase } from "@/lib/supabase"
import { getSession } from "next-auth/react"

const router = createRouter<NextApiRequest, NextApiResponse>()

router.get(async (req, res) => {
  const session = await getSession({ req })
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const limit = Number.parseInt(req.query.limit as string) || 10
  const offset = Number.parseInt(req.query.offset as string) || 0

  const { data: emails, error } = await supabase
    .from("emails")
    .select(`
      *,
      suggested_category_name,
      categories:category_id (
        id,
        name,
        color
      ),
      user_accounts:account_id (
        email,
        name
      )
    `)
    .eq("user_id", session.user.id)
    .order("received_at", { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(200).json({ emails })
})

export default router.handler({
  onError: (err, req, res) => {
    console.error(err.stack)
    res.status(500).end("Something broke!")
  },
  onNoMatch: (req, res) => {
    res.status(404).end("Page not found")
  },
})
