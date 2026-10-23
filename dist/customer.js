(() => {
  "use strict";

  const customer = window.DylanCustomer;
  const store = window.DylanDemo;
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const icon = (name) => `<svg aria-hidden="true"><use href="#icon-${name}" /></svg>`;
  const dateValue = (appointment) => new Date(`${appointment.date}T${appointment.time}:00-03:00`).getTime();
  const dateParts = (appointment) => {
    const date = new Date(`${appointment.date}T12:00:00-03:00`);
    const options = { timeZone: "America/Argentina/Buenos_Aires" };
    return {
      day: date.toLocaleDateString("es-AR", { ...options, day: "numeric" }),
      month: date.toLocaleDateString("es-AR", { ...options, month: "short" }).replace(/\.$/, ""),
      weekday: date.toLocaleDateString("es-AR", { ...options, weekday: "long" }),
      full: date.toLocaleDateString("es-AR", { ...options, weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      year: date.toLocaleDateString("es-AR", { ...options, year: "numeric" }),
    };
  };
  const elements = {
    guest: $("#guest-view"), private: $("#private-view"), greeting: $("#greeting-name"),
    next: $("#next-appointment"), list: $("#appointment-list"), count: $("#appointment-count"),
    success: $("#booking-success"), storage: $("#storage-notice"),
    form: $("#profile-form"), name: $("#profile-name"), phone: $("#profile-phone"), service: $("#profile-service"), profileStatus: $("#profile-status"),
    browserState: $("#browser-state"), browserDescription: $("#browser-description"), browserToggle: $("#browser-toggle"), browserTest: $("#browser-test"), browserFeedback: $("#browser-feedback"),
    whatsapp: $("#whatsapp-toggle"), whatsappDescription: $("#whatsapp-description"), whatsappFeedback: $("#whatsapp-feedback"),
  };
  let activeProfileId = null;
  let formDirty = false;
  let successDismissed = false;
  let browserBusy = false;
  let browserError = "";
  let browserMessage = "";
  let whatsappError = "";
  let appointmentSignature = "";
  let serviceSignature = "";
  const requestedAppointmentId = new URLSearchParams(window.location.search).get("appointment");

  const setStatus = (node, message, isError = false) => {
    node.textContent = message;
    node.classList.toggle("is-error", isError);
    node.setAttribute("role", isError ? "alert" : "status");
  };

  const ownAppointments = () => customer?.getAppointments?.() || [];
  const upcoming = (appointment, now) => appointment.status === "confirmed" && Number.isFinite(dateValue(appointment)) && dateValue(appointment) > now;
  const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "qué bueno verte";
  const setText = (selector, text) => document.querySelectorAll(selector).forEach((node) => { node.textContent = text; });

  const nextMarkup = (appointment, website) => {
    if (!appointment) return `<div class="empty-next"><span class="section-icon">${icon("scissors")}</span><div><h3>Tu próximo momento<br />te está esperando.</h3><p>No tenés turnos próximos. Elegí el día y el horario que te queden bien.</p><a class="button button-primary" href="index.html#turnos">Reservar un turno ${icon("arrow")}</a></div></div>`;
    const date = dateParts(appointment);
    return `<article class="next-card" aria-label="Próximo turno: ${escape(appointment.serviceName)}, ${escape(date.full)}, ${escape(appointment.time)} horas">
      <div class="next-card-top"><span class="card-eyebrow">STUDIO DYLAN · TU RESERVA</span><span class="status-pill status-confirmed">Confirmado</span></div>
      <div class="next-card-body"><div class="date-block" aria-hidden="true"><span class="day">${escape(date.day)}</span><span class="month">${escape(date.month)} ${escape(date.year)}</span></div><div class="next-service"><h3>${escape(appointment.serviceName)}</h3><p>Con ${escape(appointment.professional || "Dylan")} · ${escape(appointment.duration)} minutos</p><div class="next-time">${icon("clock")}<span>${escape(date.weekday)} · ${escape(appointment.time)} h</span></div></div></div>
      <div class="next-details"><div><span>Profesional</span><strong>${escape(appointment.professional || "Dylan")}</strong></div><div><span>Valor del servicio</span><strong>${escape(appointment.servicePrice || "Consultar")}</strong></div></div>
      <div class="next-location">${icon("pin")}<span>${escape(website.address || "Dirección y barrio a confirmar")}</span></div>
      <div class="next-card-bottom"><button type="button" class="calendar-button-customer" data-calendar-appointment="${escape(appointment.id)}">${icon("calendar")}Añadir a mi calendario ${icon("external")}</button><span>HORARIO DE ARGENTINA</span></div>
    </article>`;
  };

  const appointmentRow = (appointment, now) => {
    const date = dateParts(appointment);
    const isUpcoming = upcoming(appointment, now);
    const status = appointment.status === "cancelled" ? ["Cancelado", "cancelled"]
      : appointment.status === "completed" ? ["Realizado", "completed"]
      : isUpcoming ? ["Confirmado", "confirmed"] : ["Fecha pasada", "past"];
    return `<article class="appointment-row"><div class="list-date" aria-hidden="true"><strong>${escape(date.day)}</strong><span>${escape(date.month)}</span></div><div class="list-info"><h3>${escape(appointment.serviceName)}</h3><p>${escape(date.weekday)} · ${escape(appointment.time)} h · ${escape(date.year)}</p></div><span class="status-pill list-${status[1]}">${status[0]}</span>${isUpcoming ? `<button type="button" class="list-calendar" data-calendar-appointment="${escape(appointment.id)}" aria-label="Añadir ${escape(appointment.serviceName)} del ${escape(date.full)} a las ${escape(appointment.time)} al calendario">${icon("calendar")}</button>` : ""}</article>`;
  };

  const renderAppointments = (profile) => {
    const appointments = ownAppointments();
    const website = store?.get?.().website || {};
    const now = Date.now();
    const future = appointments.filter((appointment) => upcoming(appointment, now)).sort((a, b) => dateValue(a) - dateValue(b));
    const history = appointments.filter((appointment) => !upcoming(appointment, now)).sort((a, b) => dateValue(b) - dateValue(a));
    const signature = JSON.stringify({ profile: profile.id, appointments, address: website.address, next: future[0]?.id, future: future.map((appointment) => appointment.id) });
    if (signature !== appointmentSignature) {
      appointmentSignature = signature;
      elements.next.innerHTML = nextMarkup(future[0], website);
      elements.count.textContent = `${appointments.length} ${appointments.length === 1 ? "reserva" : "reservas"}`;
      elements.list.innerHTML = `${future.length ? `<div class="appointment-list">${future.map((appointment) => appointmentRow(appointment, now)).join("")}</div>` : ""}${history.length ? `<h3 class="history-heading">${future.length ? "Visitas anteriores y cancelaciones" : "Historial de reservas"}</h3><div class="appointment-list">${history.map((appointment) => appointmentRow(appointment, now)).join("")}</div>` : ""}${!appointments.length ? '<p class="empty-history">Todavía no hay reservas en tu perfil. Tus próximos turnos van a aparecer acá.</p>' : ""}`;
    }
    elements.success.hidden = successDismissed || !requestedAppointmentId || !appointments.some((appointment) => appointment.id === requestedAppointmentId && appointment.status === "confirmed");
  };

  const renderProfileForm = (profile, reset = false) => {
    const services = store?.get?.().services || [];
    const nextServiceSignature = JSON.stringify(services.map((service) => [service.id, service.name]));
    if (nextServiceSignature !== serviceSignature) {
      const pendingValue = elements.service.value;
      elements.service.innerHTML = `<option value="">Elegir en cada reserva</option>${services.map((service) => `<option value="${escape(service.id)}">${escape(service.name)}</option>`).join("")}`;
      if (services.some((service) => service.id === pendingValue)) elements.service.value = pendingValue;
      serviceSignature = nextServiceSignature;
    }
    if (reset || (!formDirty && !elements.form.contains(document.activeElement))) {
      elements.name.value = profile.name || "";
      elements.phone.value = profile.phone || "";
      elements.service.value = profile.preferredServiceId || "";
    }
  };

  const browserSupport = () => "Notification" in window && Boolean(window.isSecureContext) && "serviceWorker" in navigator;
  const permission = () => "Notification" in window ? Notification.permission : "unsupported";
  const renderNotifications = (profile) => {
    const supported = browserSupport();
    const currentPermission = permission();
    const preferred = Boolean(profile.notifications?.browser);
    const enabled = supported && currentPermission === "granted" && preferred;
    elements.browserState.classList.toggle("is-enabled", enabled);
    elements.browserState.classList.toggle("is-blocked", currentPermission === "denied");
    elements.browserToggle.disabled = browserBusy || (!supported && !preferred) || (currentPermission === "denied" && !preferred);
    elements.browserTest.hidden = !enabled;
    elements.browserTest.disabled = browserBusy;
    elements.browserToggle.classList.toggle("button-primary", !enabled);
    elements.browserToggle.classList.toggle("button-outline", enabled);
    if (!supported) {
      elements.browserState.textContent = "No disponible en este navegador";
      elements.browserDescription.textContent = "Este navegador o esta conexión no permite notificaciones web. Abrí la demo en HTTPS o en localhost desde un navegador compatible. Podés guardar tu turno en Calendario.";
      elements.browserToggle.textContent = preferred ? "Desactivar preferencia guardada" : "Notificaciones no disponibles";
    } else if (currentPermission === "denied") {
      elements.browserState.textContent = "Permiso bloqueado";
      elements.browserDescription.textContent = "El navegador bloqueó las notificaciones de este sitio. Revisá el permiso en sus ajustes para poder habilitarlas. Los recordatorios automáticos todavía no están conectados.";
      elements.browserToggle.textContent = preferred ? "Desactivar preferencia guardada" : "Permiso bloqueado en el navegador";
    } else if (enabled) {
      elements.browserState.textContent = "Permiso habilitado · Prueba disponible";
      elements.browserDescription.textContent = "Guardaste tu preferencia para este navegador. Podés probar cómo se ve una notificación; los recordatorios automáticos todavía requieren conexión.";
      elements.browserToggle.textContent = "Desactivar preferencia";
    } else if (currentPermission === "granted") {
      elements.browserState.textContent = "Permiso concedido · Preferencia desactivada";
      elements.browserDescription.textContent = "Tu navegador ya tiene permiso. Activá tu preferencia si querés probar las notificaciones. Los recordatorios automáticos todavía requieren conexión.";
      elements.browserToggle.textContent = "Activar mi preferencia";
    } else {
      elements.browserState.textContent = "Sin habilitar";
      elements.browserDescription.textContent = "Podés permitir notificaciones en este dispositivo y hacer una prueba. Los recordatorios automáticos todavía requieren conexión.";
      elements.browserToggle.textContent = "Habilitar notificaciones";
    }
    if (browserBusy) elements.browserToggle.textContent = "Un momento…";
    setStatus(elements.browserFeedback, browserError || browserMessage, Boolean(browserError));
    setStatus(elements.whatsappFeedback, whatsappError, Boolean(whatsappError));
    const whatsapp = Boolean(profile.notifications?.whatsapp);
    elements.whatsapp.setAttribute("aria-checked", String(whatsapp));
    elements.whatsappDescription.textContent = whatsapp
      ? "Preferencia guardada. Pendiente de conexión: todavía no se envían mensajes por WhatsApp."
      : "Guardá tu preferencia para cuando esté disponible. Todavía no se envían mensajes.";
  };

  const updateNav = () => {
    const section = ["mis-turnos", "recordatorios", "mis-datos"].includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "mi-espacio";
    document.querySelectorAll("[data-nav]").forEach((link) => {
      const active = link.dataset.nav === section;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
  };

  const render = () => {
    const shared = store?.get?.();
    if (shared) window.DylanCalendarPanel?.render(shared);
    const profile = customer?.getProfile?.();
    const loggedIn = Boolean(profile);
    elements.guest.hidden = loggedIn;
    elements.private.hidden = !loggedIn;
    document.querySelectorAll("[data-private-control]").forEach((node) => { node.hidden = !loggedIn; });
    document.querySelectorAll("[data-guest-control]").forEach((node) => { node.hidden = loggedIn; });
    if (!profile) {
      const calendar = $("#dylan-calendar-dialog");
      if (calendar?.open) calendar.close();
      activeProfileId = null;
      appointmentSignature = "";
      formDirty = false;
      document.title = "Mi espacio · Studio Dylan";
      return;
    }
    const changedProfile = activeProfileId !== profile.id;
    if (changedProfile) {
      const calendar = $("#dylan-calendar-dialog");
      if (calendar?.open) calendar.close();
      activeProfileId = profile.id;
      formDirty = false;
      browserError = "";
      browserMessage = "";
      whatsappError = "";
      setStatus(elements.profileStatus, "");
    }
    document.title = `${firstName(profile.name)} · Mi espacio · Studio Dylan`;
    elements.greeting.textContent = firstName(profile.name);
    setText("[data-profile-name]", firstName(profile.name));
    setText("[data-profile-initial]", firstName(profile.name).slice(0, 1).toLocaleUpperCase("es-AR"));
    elements.storage.hidden = customer.storageAvailable?.() !== false && store?.storageAvailable?.() !== false;
    renderAppointments(profile);
    renderProfileForm(profile, changedProfile);
    renderNotifications(profile);
  };

  const openLogin = () => {
    if (window.DylanCustomerUI?.openLogin) window.DylanCustomerUI.openLogin({ onSuccess: () => { render(); } });
  };

  const registerNotificationWorker = () => navigator.serviceWorker.register("./customer-sw.js").then((registration) => {
    if (registration.active) return registration;
    return new Promise((resolve, reject) => {
      const worker = registration.installing || registration.waiting;
      if (!worker) { reject(new Error("No se pudo preparar la prueba de notificaciones. Volvé a intentarlo.")); return; }
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error("La preparación tardó más de lo esperado. Volvé a intentarlo.")); }, 12000);
      const cleanup = () => { window.clearTimeout(timeout); worker.removeEventListener("statechange", onStateChange); };
      const onStateChange = () => {
        if (worker.state === "activated") { cleanup(); resolve(registration); }
        else if (worker.state === "redundant") { cleanup(); reject(new Error("No se pudo activar la prueba de notificaciones.")); }
      };
      worker.addEventListener("statechange", onStateChange);
      onStateChange();
    });
  });

  const toggleBrowser = async () => {
    const profile = customer.getProfile();
    if (!profile || browserBusy) return;
    browserError = "";
    browserMessage = "";
    // A saved preference can always be turned off, even if the browser changed its permission.
    if (profile.notifications?.browser && (permission() !== "default" || !browserSupport())) {
      try {
        customer.setNotifications({ browser: false });
        browserMessage = "Preferencia desactivada. El permiso del navegador se administra desde los ajustes de este sitio.";
      } catch (error) { browserError = error.message || "No se pudo guardar la preferencia."; }
      render();
      return;
    }
    if (!browserSupport()) return;
    browserBusy = true;
    const initiatingProfileId = profile.id;
    try {
      // Keep requestPermission directly in the user's click event.
      const resultPromise = permission() === "default" ? Notification.requestPermission() : Promise.resolve(permission());
      renderNotifications(profile);
      const result = await resultPromise;
      if (customer.getProfile()?.id !== initiatingProfileId) return;
      if (result !== "granted") {
        browserMessage = result === "denied" ? "El permiso quedó bloqueado. Podés cambiarlo en los ajustes de este sitio." : "No habilitaste el permiso. Podés volver a intentarlo cuando quieras.";
        return;
      }
      await registerNotificationWorker();
      if (customer.getProfile()?.id !== initiatingProfileId) return;
      customer.setNotifications({ browser: true });
      browserMessage = "Permiso habilitado y preferencia guardada. Usá «Probar notificación» para ver un ejemplo. Los avisos automáticos siguen pendientes de conexión.";
    } catch (error) {
      browserError = error.message || "No se pudo habilitar la prueba. Revisá los permisos de este navegador.";
    } finally {
      browserBusy = false;
      render();
    }
  };

  const testBrowserNotification = async () => {
    const profile = customer.getProfile();
    if (!profile || browserBusy || !browserSupport() || permission() !== "granted" || !profile.notifications?.browser) return;
    browserBusy = true;
    browserError = "";
    browserMessage = "";
    renderNotifications(profile);
    try {
      const registration = await registerNotificationWorker();
      if (customer.getProfile()?.id !== profile.id || !customer.getProfile()?.notifications?.browser || permission() !== "granted") return;
      await registration.showNotification("Studio Dylan · Notificación de prueba", {
        body: "Así se vería un aviso de tu turno. Esta es una prueba; todavía no hay recordatorios automáticos.",
        icon: "assets/dylan-logo.jpg",
        tag: "studio-dylan-manual-preview",
      });
      browserMessage = "Prueba enviada a este dispositivo. Si no aparece, revisá los avisos del sistema o el modo No molestar.";
    } catch (error) { browserError = error.message || "No se pudo mostrar la notificación. Revisá los ajustes del navegador y del sistema."; }
    finally { browserBusy = false; render(); }
  };

  elements.form.addEventListener("input", () => { formDirty = true; setStatus(elements.profileStatus, ""); });
  elements.form.addEventListener("change", () => { formDirty = true; setStatus(elements.profileStatus, ""); });
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!elements.form.reportValidity() || !customer?.getProfile()) return;
    try {
      customer.updateProfile({ name: elements.name.value, phone: elements.phone.value, preferredServiceId: elements.service.value });
      formDirty = false;
      const saved = customer.getProfile();
      if (saved) renderProfileForm(saved, true);
      setStatus(elements.profileStatus, customer.storageAvailable?.() === false ? "Datos actualizados en esta página. El navegador no permite guardarlos al cerrar." : "Tus datos ya están guardados.");
      render();
    } catch (error) { setStatus(elements.profileStatus, error.message || "No se pudieron guardar tus datos. Revisá los campos.", true); }
  });

  document.addEventListener("click", (event) => {
    const calendar = event.target.closest("[data-calendar-appointment]");
    if (calendar) {
      const appointment = ownAppointments().find((item) => item.id === calendar.dataset.calendarAppointment);
      if (appointment && upcoming(appointment, Date.now())) window.DylanCalendarPanel?.openAppointment(appointment, "customer");
      return;
    }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "login") openLogin();
    if (action === "logout") {
      customer.signOut();
      formDirty = false;
      elements.form.reset();
      render();
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    if (action === "dismiss-success") { successDismissed = true; elements.success.hidden = true; }
    if (action === "toggle-browser") void toggleBrowser();
    if (action === "test-browser") void testBrowserNotification();
    if (action === "toggle-whatsapp" && customer.getProfile()) {
      whatsappError = "";
      try { customer.setNotifications({ whatsapp: !customer.getProfile().notifications?.whatsapp }); }
      catch (error) { whatsappError = error.message || "No se pudo guardar tu preferencia de WhatsApp."; }
      render();
    }
  });
  window.addEventListener("hashchange", updateNav);
  window.addEventListener("focus", render);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  customer?.subscribe?.(render);
  store?.subscribe?.(render);
  setText("[data-current-year]", new Date().toLocaleDateString("es-AR", { year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }));
  window.setInterval(() => { if (!document.hidden && customer?.getProfile?.()) render(); }, 60000);
  updateNav();
  render();
})();
