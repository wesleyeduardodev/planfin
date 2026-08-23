"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Bell, BellOff, BellRing, Loader2, Smartphone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Settings {
  remindersEnabled: boolean
  reminderEveHour: number
  reminderDayHour: number
  remindExpenses: boolean
  remindIncomes: boolean
}

interface Device {
  id: string
  endpoint: string
  userAgent: string | null
  createdAt: string
  lastUsedAt: string | null
}

interface DevicesResponse {
  configured: boolean
  publicKey: string | null
  devices: Device[]
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function deviceLabel(ua: string | null): string {
  if (!ua) return "Aparelho"
  if (/iPhone/.test(ua)) return "iPhone"
  if (/iPad/.test(ua)) return "iPad"
  if (/Android/.test(ua)) {
    const m = /Android[^;]*;\s*([^)]+)\)/.exec(ua)
    return m ? `Android · ${m[1].replace(/ Build.*/, "").trim()}` : "Android"
  }
  if (/Windows/.test(ua)) return "Windows"
  if (/Macintosh/.test(ua)) return "Mac"
  return "Aparelho"
}

const EVE_HOURS = [17, 18, 19, 20, 21, 22]
const DAY_HOURS = [6, 7, 8, 9, 10, 11, 12]

export function ReminderSettingsCard() {
  const queryClient = useQueryClient()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [standalone, setStandalone] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  })
  const { data: devicesData, refetch: refetchDevices } = useQuery<DevicesResponse>({
    queryKey: ["push-devices"],
    queryFn: () => fetch("/api/push/devices").then((r) => r.json()),
  })

  // Detecta suporte / iOS / instalação / subscription atual
  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setSupported(ok)
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    setIsIOS(ios)
    const sa = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true
    setStandalone(sa)
    if (ok) {
      setPermission(Notification.permission)
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setCurrentEndpoint(sub?.endpoint ?? null))
        .catch(() => {})
    }
  }, [])

  const thisDeviceRegistered = !!currentEndpoint && !!devicesData?.devices.some((d) => d.endpoint === currentEndpoint)

  const patch = useMutation({
    mutationFn: async (body: Partial<Settings>) => {
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
    onError: () => toast.error("Erro ao salvar preferência"),
  })

  async function enable() {
    if (!devicesData?.publicKey) {
      toast.error("Servidor sem chaves de notificação configuradas")
      return
    }
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== "granted") {
        toast.error("Permissão de notificação não concedida")
        return
      }
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(devicesData.publicKey),
        })
      }
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      })
      if (!res.ok) throw new Error()
      setCurrentEndpoint(sub.endpoint)
      await Promise.all([refetchDevices(), queryClient.invalidateQueries({ queryKey: ["settings"] })])
      toast.success("Lembretes ativados neste aparelho")
    } catch {
      toast.error("Não foi possível ativar as notificações")
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const endpoint = sub?.endpoint ?? currentEndpoint
      if (sub) await sub.unsubscribe().catch(() => {})
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      })
      setCurrentEndpoint(null)
      await Promise.all([refetchDevices(), queryClient.invalidateQueries({ queryKey: ["settings"] })])
      toast.success("Lembretes desativados neste aparelho")
    } catch {
      toast.error("Erro ao desativar")
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    setBusy(true)
    try {
      const res = await fetch("/api/push/test", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.sent > 0 ? `Teste enviado para ${data.sent} aparelho(s)` : "Nenhum aparelho recebeu o teste")
    } catch (e) {
      toast.error((e as Error).message || "Erro ao enviar teste")
    } finally {
      setBusy(false)
    }
  }

  const active = !!settings?.remindersEnabled && (devicesData?.devices.length ?? 0) > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Lembretes de vencimento
          </span>
          <span className={cn(
            "text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full",
            active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-muted text-muted-foreground"
          )}>
            {active ? "Ativo" : "Desligado"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Receba uma notificação do PlanFin na <strong>véspera</strong> e na <strong>manhã do dia</strong> de
          cada despesa ou receita pendente com data. Nada para configurar fora do app.
        </p>

        {supported === false && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            Este navegador não suporta notificações push.
            {isIOS && " No iPhone, instale o PlanFin na Tela de Início (Compartilhar → Adicionar à Tela de Início) e ative por lá."}
          </div>
        )}

        {supported && isIOS && !standalone && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
            No iPhone as notificações só funcionam com o app instalado: toque em <strong>Compartilhar → Adicionar à Tela de Início</strong> e ative os lembretes por lá.
          </div>
        )}

        {supported && permission === "denied" && (
          <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm">
            As notificações estão bloqueadas para este site. Libere nas configurações do navegador/aparelho e tente de novo.
          </div>
        )}

        {devicesData && !devicesData.configured && (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm">
            O servidor ainda não tem as chaves VAPID configuradas (veja <code>docs/fluxo-notificacoes/README.md</code>).
          </div>
        )}

        {/* Ativar / Desativar neste aparelho */}
        {supported && (
          <div className="flex flex-wrap gap-2">
            {thisDeviceRegistered ? (
              <>
                <Button variant="outline" size="sm" onClick={sendTest} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar teste
                </Button>
                <Button variant="outline" size="sm" onClick={disable} disabled={busy} className="text-muted-foreground">
                  <BellOff className="mr-2 h-4 w-4" /> Desativar neste aparelho
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={enable} disabled={busy || permission === "denied" || !devicesData?.configured}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                Ativar notificações neste aparelho
              </Button>
            )}
          </div>
        )}

        {/* Preferências */}
        {settings && (
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t", !active && "opacity-60")}>
            <div className="space-y-1.5">
              <Label className="text-sm">Véspera às</Label>
              <Select value={String(settings.reminderEveHour)} onValueChange={(v) => patch.mutate({ reminderEveHour: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVE_HOURS.map((h) => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">No dia às</Label>
              <Select value={String(settings.reminderDayHour)} onValueChange={(v) => patch.mutate({ reminderDayHour: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_HOURS.map((h) => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-border" checked={settings.remindExpenses} onChange={(e) => patch.mutate({ remindExpenses: e.target.checked })} />
                Despesas
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-border" checked={settings.remindIncomes} onChange={(e) => patch.mutate({ remindIncomes: e.target.checked })} />
                Receitas
              </label>
            </div>
          </div>
        )}

        {/* Aparelhos */}
        {devicesData && devicesData.devices.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Aparelhos</div>
            <ul className="space-y-1">
              {devicesData.devices.map((d) => (
                <li key={d.id} className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{deviceLabel(d.userAgent)}</span>
                  {d.endpoint === currentEndpoint && <span className="text-[10px] rounded-full bg-primary/10 text-primary px-1.5 py-0.5 font-semibold">este</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          O horário pode variar em alguns minutos. Só avisa itens pendentes — marcou como pago, não avisa mais.
        </p>
      </CardContent>
    </Card>
  )
}
