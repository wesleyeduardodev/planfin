"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/components/auth/auth-shell"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erro ao criar conta")
        setLoading(false)
        return
      }

      // Auto login after register
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      setLoading(false)

      if (result?.error) {
        setError("Conta criada, mas erro ao fazer login. Tente novamente.")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("Erro ao criar conta")
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Criar sua conta"
      subtitle="Leva menos de um minuto. Sem cartão, sem mensalidade."
      footer={<>Já tem conta? <Link href="/login" className="font-medium text-primary hover:underline">Entrar</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 rounded-lg bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 rounded-lg bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-lg bg-background pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" size="lg" className="w-full h-11 rounded-lg text-[15px] font-semibold shadow-md shadow-primary/25" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Criar conta <ArrowRight className="ml-1.5 h-4 w-4" /></>}
        </Button>
      </form>
    </AuthShell>
  )
}
