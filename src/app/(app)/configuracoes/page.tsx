"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession, signOut } from "next-auth/react"
import { toast } from "sonner"
import { Save, Plus, X, User, Lock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

interface Settings {
  id: string
  periodCount: number
  periodDays: number[]
}

interface Profile {
  id: string
  name: string
  email: string
}

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient()
  const { update: updateSession } = useSession()
  const [periodDays, setPeriodDays] = useState<number[]>([1])

  // Profile state
  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

  const { data: settings, isLoading: loadingSettings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  })

  const { data: profile, isLoading: loadingProfile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
  })

  useEffect(() => {
    if (settings) {
      setPeriodDays(settings.periodDays)
    }
  }, [settings])

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name)
      setProfileEmail(profile.email)
    }
  }, [profile])

  // --- Period settings ---
  function addPeriod() {
    const count = periodDays.length + 1
    const step = Math.floor(30 / count)
    const newDay = Math.min((periodDays[periodDays.length - 1] ?? 1) + step, 28)
    const finalDay = periodDays.includes(newDay) ? newDay + 1 : newDay
    setPeriodDays([...periodDays, Math.min(finalDay, 31)])
  }

  function removePeriod(index: number) {
    if (periodDays.length <= 1) return
    setPeriodDays(periodDays.filter((_, i) => i !== index))
  }

  function handleDayChange(index: number, value: number) {
    const newDays = [...periodDays]
    newDays[index] = value
    setPeriodDays(newDays)
  }

  const periodCount = periodDays.length

  const savePeriodsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodCount, periodDays }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.success("Configurações de períodos salvas")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // --- Profile ---
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName, email: profileEmail }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar")
      }
      return res.json()
    },
    onSuccess: () => {
      const emailChanged = profileEmail !== profile?.email
      if (emailChanged) {
        toast.success("Email alterado. Faça login novamente.")
        signOut({ callbackUrl: "/login" })
        return
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      updateSession({ name: profileName })
      toast.success("Perfil atualizado")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // --- Password ---
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem")
      }
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao alterar senha")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Senha alterada. Faça login novamente.")
      signOut({ callbackUrl: "/login" })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  // --- Delete account ---
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", { method: "DELETE" })
      if (!res.ok) throw new Error("Erro ao excluir conta")
    },
    onSuccess: () => {
      signOut({ callbackUrl: "/login" })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (loadingSettings || loadingProfile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando...
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Ajuste as preferências do sistema"
      />

      <div className="space-y-6">
        {/* Row 1: Profile + Password */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={() => saveProfileMutation.mutate()}
              disabled={saveProfileMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveProfileMutation.isPending ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Senha atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            >
              <Lock className="mr-2 h-4 w-4" />
              {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>
        </div>

        {/* Row 2: Periods + Delete */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Períodos do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Defina como dividir o mês em períodos. Cada período começa no dia
              configurado e vai até o dia anterior ao próximo período (o último
              vai até o fim do mês). Estes valores são usados ao gerar novos
              planos mensais.
            </p>

            <div className="space-y-3">
              {periodDays.map((day, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-sm">
                      Início do Período {i + 1}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={day}
                      onChange={(e) =>
                        handleDayChange(i, parseInt(e.target.value) || 1)
                      }
                      readOnly={i === 0}
                      className={i === 0 ? "bg-muted" : ""}
                    />
                  </div>
                  {i > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePeriod(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPeriod}
                className="mt-2"
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar Período
              </Button>
            </div>

            <Button
              className="mt-4"
              onClick={() => savePeriodsMutation.mutate()}
              disabled={savePeriodsMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {savePeriodsMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Excluir Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ao excluir sua conta, todos os seus dados serão removidos
              permanentemente, incluindo planos, despesas, receitas e
              configurações. Esta ação não pode ser desfeita.
            </p>
            <Button
              variant="destructive"
              onClick={() => setDeleteAccountOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir minha conta
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        title="Excluir Conta"
        description="Tem certeza? Todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita."
        onConfirm={() => deleteAccountMutation.mutate()}
        loading={deleteAccountMutation.isPending}
      />
    </>
  )
}
