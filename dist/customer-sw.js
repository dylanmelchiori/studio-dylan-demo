/* Manual notification preview only. No scheduled messages or cached pages. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL("customer.html", self.registration.scope);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => {
      const url = new URL(client.url);
      return url.origin === destination.origin && url.pathname === destination.pathname;
    });
    if (existing) return existing.focus();
    return self.clients.openWindow(destination.href);
  }));
});
