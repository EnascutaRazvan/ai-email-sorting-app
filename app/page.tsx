import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirect to the dashboard or sign-in page
  redirect("/dashboard")
  return null
}
