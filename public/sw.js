self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

// Notificação push (lembretes de vencimento)
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "PlanFin", body: event.data ? event.data.text() : "" }
  }
  const title = data.title || "PlanFin"
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    data: { url: data.url || "/" },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Toque na notificação: foca a janela aberta ou abre uma nova na URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const client = list.find((w) => "focus" in w)
      if (client) {
        if ("navigate" in client) client.navigate(url)
        return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
