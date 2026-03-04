import { redirect } from "next/navigation"

export default function HomePage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  redirect(`/planejamento/${year}/${month}`)
}
