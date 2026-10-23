(() => {
  "use strict";

  const store = window.DylanDemo;
  const files = window.DylanCalendarFiles;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const calendarIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h2m3 0h2m-7 3h2"/></svg>';
  const arrowIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4h6v6m0-6L10 14m0-9H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-5"/></svg>';
  const dateLabel = (value) => new Date(`${value}T12:00:00Z`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" });
  let latestData;
  let activeAppointment = null;
  let activeAudience = "admin";
  let dialogMode = "";
  let dialog;

  const read = () => store?.get?.() || latestData || { appointments: [], website: {} };
  const selectedDate = () => document.getElementById("agenda-date")?.value || store?.today?.() || "";
  const appointmentsForDay = (data) => (data.appointments || []).filter((appointment) => appointment.date === selectedDate() && appointment.status === "confirmed");
  const countLabel = (count) => `${count} ${count === 1 ? "turno confirmado" : "turnos confirmados"}`;
  const setStatus = (node, message, isError = false) => {
    if (!node) return;
    node.textContent = message;
    node.hidden = !message;
    node.classList.toggle("is-error", isError);
    node.setAttribute("role", isError ? "alert" : "status");
  };
  const dialogStatus = (message, isError = false) => setStatus(dialog?.querySelector("[data-calendar-status]"), message, isError);
  const hubStatus = (message, isError = false) => setStatus(document.querySelector("#calendar-connections [data-calendar-hub-status]"), message, isError);

  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "dylan-calendar-dialog";
    dialog.className = "calendar-dialog";
    dialog.setAttribute("aria-labelledby", "dylan-calendar-dialog-title");
    document.body.append(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-calendar-close]")) dialog.close();
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      }
    });
    dialog.addEventListener("close", () => { activeAppointment = null; dialogMode = ""; });
    return dialog;
  };

  const dialogHeader = (eyebrow, title) => `<div class="calendar-dialog-heading"><div><p class="calendar-eyebrow">${escape(eyebrow)}</p><h2 id="dylan-calendar-dialog-title">${escape(title)}</h2></div><button class="calendar-close" type="button" data-calendar-close aria-label="Cerrar calendario"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button></div>`;
  const showDialog = () => {
    if (!dialog.open) dialog.showModal();
  };

  const currentAppointment = () => {
    if (!activeAppointment) throw new Error("No se encontró el turno. Volvé a la agenda y elegí otro.");
    const appointment = read().appointments.find((item) => item.id === activeAppointment.id);
    if (!appointment) throw new Error("Este turno ya no está disponible. Cerrá esta ventana y revisá la agenda.");
    if (appointment.status === "cancelled") throw new Error("Este turno está cancelado. Elegí un turno confirmado para añadirlo al calendario.");
    return appointment;
  };

  const exportDay = (source) => {
    const notify = source === "dialog" ? dialogStatus : hubStatus;
    try {
      const data = read();
      const appointments = appointmentsForDay(data);
      if (!appointments.length) {
        notify("No hay turnos confirmados para exportar en esta fecha. Elegí otro día en la agenda.");
        return;
      }
      const events = appointments.map((appointment) => files.eventFromAppointment(appointment, data.website, "admin"));
      files.download(events, `studio-dylan-turnos-${selectedDate()}.ics`);
      notify(`Archivo con ${countLabel(appointments.length)} descargado: abrilo e importalo desde tu calendario. Todavía no hay sincronización automática.`);
    } catch (error) { notify(error.message || "No se pudo preparar el calendario. Intentá nuevamente.", true); }
  };

  const openConnections = () => {
    ensureDialog();
    dialogMode = "connections";
    activeAppointment = null;
    dialog.innerHTML = `${dialogHeader("TUS TURNOS, TAMBIÉN EN EL CELULAR", "Suscripción a la agenda")}
      <p class="calendar-intro">Así funcionará: te suscribís una vez y tu calendario consulta los turnos que cargás en la web.</p>
      <div class="calendar-subscription-badges"><span>Pendiente de conexión</span><span>Solo lectura</span><span>Actualización periódica</span></div>
      <ol class="calendar-subscription-steps"><li><span aria-hidden="true">1</span><div><h3>Agendás en la web</h3><p>Creás o modificás los turnos desde este panel.</p></div></li><li><span aria-hidden="true">2</span><div><h3>Te suscribís una vez</h3><p>Añadís la agenda del estudio a tu calendario.</p></div></li><li><span aria-hidden="true">3</span><div><h3>Tu calendario se actualiza</h3><p>iPhone o Google consultan los cambios de forma periódica.</p></div></li></ol>
      <div class="calendar-connection-note"><h3>Preparado para la próxima etapa</h3><p>Vista de demostración. Todavía no hay un calendario vinculado.</p><label class="calendar-feed-label" for="calendar-subscription-link">Enlace de suscripción<input id="calendar-subscription-link" type="text" value="Disponible al activar la agenda compartida" disabled aria-describedby="calendar-feed-note" /></label><p id="calendar-feed-note">El enlace se habilitará al activar la agenda compartida.</p></div>
      <div class="calendar-providers calendar-subscription-providers">
        <button class="calendar-provider" type="button" data-calendar-provider="iphone" aria-expanded="false" aria-controls="calendar-provider-iphone"><span class="calendar-provider-mark" aria-hidden="true">${calendarIcon}</span><span><strong>Calendario de iPhone / Apple</strong><span class="calendar-provider-caption">Ver cómo se vinculará</span></span><span class="calendar-provider-arrow" aria-hidden="true">›</span></button>
        <div id="calendar-provider-iphone" class="calendar-provider-instructions" hidden><p>Cuando esté habilitado, abrí el enlace de suscripción en el iPhone y confirmá que querés añadir la agenda en Calendario.</p><p>Los turnos aparecerán en un calendario aparte, de solo lectura. Los cambios se harán desde este panel.</p></div>
        <button class="calendar-provider" type="button" data-calendar-provider="google" aria-expanded="false" aria-controls="calendar-provider-google"><span class="calendar-provider-mark calendar-google-mark" aria-hidden="true">G</span><span><strong>Google Calendar</strong><span class="calendar-provider-caption">Ver cómo se vinculará</span></span><span class="calendar-provider-arrow" aria-hidden="true">›</span></button>
        <div id="calendar-provider-google" class="calendar-provider-instructions" hidden><p>En Google Calendar desde la computadora, irás a Otros calendarios → + → Desde URL. Ahí podrás pegar el enlace de suscripción cuando esté habilitado.</p><p>Luego podrás consultar esa agenda desde el calendario de la misma cuenta en tu celular.</p></div>
      </div>
      <p class="calendar-fineprint">La actualización dependerá de cada calendario; no será instantánea. La suscripción llevará los cambios de la web al calendario. Los cambios hechos en el calendario no modificarán la agenda de la web.</p>
      <details class="calendar-manual-options"><summary>Mientras tanto: añadir turnos manualmente</summary><p>Podés usar el botón Calendario de cada turno o descargar los turnos confirmados de la fecha elegida.</p><div class="calendar-day-export"><p class="calendar-day-label" data-calendar-export-label></p><button class="calendar-button calendar-button-secondary" type="button" data-calendar-export>${calendarIcon}<span>Exportar turnos del día (.ics)</span></button><p class="calendar-fineprint">El archivo incluye los nombres de tus clientes. Abrilo e importalo desde tu calendario. Los cambios posteriores de la web no actualizan los eventos importados.</p></div></details>
      <p class="calendar-status" data-calendar-status role="status" aria-live="polite" hidden></p>
      <div class="calendar-dialog-footer"><button class="calendar-button calendar-button-secondary" type="button" data-calendar-close>Volver a la agenda</button></div>`;
    dialog.querySelector("[data-calendar-export]").addEventListener("click", () => exportDay("dialog"));
    dialog.querySelectorAll("[data-calendar-provider]").forEach((button) => button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      document.getElementById(button.getAttribute("aria-controls")).hidden = expanded;
    }));
    updateConnectionSummary(read());
    showDialog();
  };

  const updateConnectionSummary = (data) => {
    const summary = dialog?.querySelector("[data-calendar-export-label]");
    if (!summary) return;
    const date = selectedDate();
    summary.textContent = `${countLabel(appointmentsForDay(data).length)}${date ? ` · ${dateLabel(date)}` : ""}`;
  };

  const ensureHub = () => {
    const panel = document.getElementById("panel-agenda");
    if (!panel || document.getElementById("calendar-connections")) return;
    const hub = document.createElement("section");
    hub.id = "calendar-connections";
    hub.className = "calendar-hub";
    hub.setAttribute("aria-labelledby", "calendar-hub-title");
    hub.innerHTML = `<div class="calendar-hub-main"><span class="calendar-hub-icon" aria-hidden="true">${calendarIcon}</span><div class="calendar-hub-copy"><div class="calendar-hub-title-line"><h2 id="calendar-hub-title">Tu agenda, también en tu calendario</h2><span class="calendar-unlinked" title="Vista de demostración: la suscripción todavía no está activa">Sin vincular</span></div><p>Una suscripción para consultar tus turnos desde iPhone o Google Calendar.</p><p class="calendar-hub-count" data-calendar-count></p></div></div><div class="calendar-hub-actions"><button class="calendar-button calendar-button-primary" type="button" data-calendar-connect>Suscribir mi calendario ${arrowIcon}</button></div><p class="calendar-status" data-calendar-hub-status role="status" aria-live="polite" hidden></p>`;
    const agenda = panel.querySelector(".agenda-card");
    if (agenda) agenda.insertAdjacentElement("afterend", hub); else panel.append(hub);
    hub.querySelector("[data-calendar-connect]").addEventListener("click", openConnections);
  };

  const openAppointment = (appointment, audience = "admin") => {
    ensureDialog();
    dialogMode = "appointment";
    activeAppointment = appointment;
    activeAudience = audience === "customer" ? "customer" : "admin";
    dialog.innerHTML = `${dialogHeader("UN RECORDATORIO PARA TU DÍA", "Añadir al calendario")}
      <p class="calendar-intro">Guardá este turno de prueba en el calendario que usás.</p>
      <div class="calendar-event-summary"><span class="calendar-event-icon" aria-hidden="true">${calendarIcon}</span><div><h3>${escape(appointment?.serviceName || "Turno de Studio Dylan")}</h3>${activeAudience === "admin" && appointment?.client ? `<p class="calendar-event-client">${escape(appointment.client)}</p>` : ""}<p>${appointment?.date ? escape(dateLabel(appointment.date)) : ""}${appointment?.time ? ` · ${escape(appointment.time)} h` : ""}</p>${appointment?.duration ? `<p>${escape(appointment.duration)} minutos · Horario de Argentina</p>` : ""}</div></div>
      <div class="calendar-event-options" data-calendar-event-options><a class="calendar-button calendar-button-primary" data-calendar-google target="_blank" rel="noopener noreferrer" title="Abre Google Calendar en otra pestaña para revisar y guardar el evento"><span>Google Calendar</span>${arrowIcon}</a><button class="calendar-button calendar-button-secondary" type="button" data-calendar-ics>${calendarIcon}<span>Calendario / iPhone (.ics)</span></button></div>
      <p class="calendar-fineprint">Google Calendar se abre en otra pestaña. Para iPhone, Apple u Outlook, descargá el archivo .ics y abrilo o importalo desde tu calendario.</p>
      <p class="calendar-demo-note">Se abre un evento de prueba para que lo revises y lo guardes. Todavía no se sincroniza automáticamente; los cambios de la web no actualizan tu calendario.</p>
      <p class="calendar-status" data-calendar-status role="status" aria-live="polite" hidden></p>
      <div class="calendar-dialog-footer"><button class="calendar-button calendar-button-secondary" type="button" data-calendar-close>Volver</button></div>`;
    const google = dialog.querySelector("[data-calendar-google]");
    try {
      google.href = files.googleUrl(files.eventFromAppointment(currentAppointment(), read().website, activeAudience));
    } catch (error) {
      dialog.querySelector("[data-calendar-event-options]").hidden = true;
      dialogStatus(error.message || "No se pudo preparar este evento.", true);
    }
    google.addEventListener("click", (event) => {
      try {
        google.href = files.googleUrl(files.eventFromAppointment(currentAppointment(), read().website, activeAudience));
        dialogStatus("Revisá el evento en Google Calendar y guardalo para añadirlo.");
      } catch (error) { event.preventDefault(); dialogStatus(error.message, true); }
    });
    dialog.querySelector("[data-calendar-ics]").addEventListener("click", () => {
      try {
        const current = currentAppointment();
        files.download([files.eventFromAppointment(current, read().website, activeAudience)], `studio-dylan-turno-${current.date}-${current.time.replace(":", "")}.ics`);
        dialogStatus("Archivo descargado: abrilo e importalo desde tu calendario.");
      } catch (error) { dialogStatus(error.message || "No se pudo descargar el evento. Intentá nuevamente.", true); }
    });
    showDialog();
  };

  const render = (data) => {
    latestData = data;
    ensureHub();
    const summary = document.querySelector("#calendar-connections [data-calendar-count]");
    if (summary) summary.textContent = `${countLabel(appointmentsForDay(data).length)} en la fecha elegida · Suscripción pendiente de conexión`;
    hubStatus("");
    if (!dialog?.open) return;
    if (dialogMode === "connections") updateConnectionSummary(data);
    if (dialogMode === "appointment" && activeAppointment) {
      try { currentAppointment(); }
      catch (error) {
        dialog.querySelector("[data-calendar-event-options]").hidden = true;
        dialogStatus(error.message, true);
      }
    }
  };

  window.DylanCalendarPanel = { openAppointment, render };
})();
