import { NextResponse } from "next/server"
import { auth } from "./auth"

export async function getAuthUser() {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }
  return session.user
}

export function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function serverError(error: unknown) {
  console.error(error)
  return NextResponse.json({ error: "Erro interno" }, { status: 500 })
}
