(() => {
  "use strict";
  const store = window.DylanDemo;
  const $ = (selector) => document.querySelector(selector);
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const dateLabel = (date, options = { weekday: "long", day: "numeric", month: "long" }) => new Date(`${date}T12:00:00Z`).toLocaleDateString("es-AR", { ...options, timeZone: "America/Argentina/Buenos_Aires" });
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const labels = { confirmed: "Confirmado", completed: "Atendido", cancelled: "Cancelado" };
  const sources = { example: "Ejemplo", manual: "Carga manual", web: "Reserva web" };
  const requestedDate = new URLSearchParams(window.location.search).get("date");
  let selectedDate = store.isOpenDay(requestedDate) ? requestedDate : store.nextOpenDay(store.today());
  let currentView = "agenda";
  let pendingConfirmation = null;
  let toastTimer;
  const toast = (message) => {
    $("#admin-toast").textContent = message;
    $("#admin-toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#admin-toast").classList.remove("visible"), 4000);
  };
  const emptyState = (title, copy) => `<div class="empty-state"><span aria-hidden="true">—</span><h3>${escape(title)}</h3><p>${escape(copy)}</p></div>`;
  const renderAgenda = (data) => {
    $("#agenda-date").value = selectedDate;
    $("#agenda-heading").textContent = dateLabel(selectedDate);
    const appointments = data.appointments.filter((a) => a.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
    $("#stat-total").textContent = appointments.filter((a) => a.status !== "cancelled").length;
    $("#stat-pending").textContent = appointments.filter((a) => a.status === "confirmed").length;
    $("#stat-done").textContent = appointments.filter((a) => a.status === "completed").length;
    const status = $("#status-filter").value;
    const filtered = appointments.filter((a) => status === "all" || a.status === status);
    $("#appointment-list").innerHTML = filtered.length ? filtered.map((a) => `
      <article class="appointment-card ${escape(a.status)}">
        <div class="appointment-time"><strong>${escape(a.time)}</strong><span>${a.duration} min</span></div>
        <div class="client-avatar" aria-hidden="true">${escape(initials(a.client))}</div>
        <div class="appointment-detail"><h3>${escape(a.client)}</h3><p>${escape(a.serviceName)} <span class="source-label">· ${escape(sources[a.source] || "Ejemplo")}</span></p>${a.notes ? `<p class="appointment-note">${escape(a.notes)}</p>` : ""}</div>
        <span class="status-badge ${escape(a.status)}">${labels[a.status]}</span>
        <div class="appointment-actions">${a.status === "confirmed" ? `<button class="button-small" type="button" data-complete="${escape(a.id)}" aria-label="Marcar como atendido a ${escape(a.client)}">Atendido</button><button class="button-text danger" type="button" data-cancel="${escape(a.id)}" aria-label="Cancelar turno de ${escape(a.client)}">Cancelar</button>` : `<span class="record-label">${a.status === "completed" ? "Finalizado" : "Horario liberado"}</span>`}</div>
      </article>`).join("") : emptyState("Tu agenda está libre", status !== "all" ? "No hay turnos con este estado en la fecha elegida." : store.isOpenDay(selectedDate) ? "Agregá un turno para empezar a organizar el día." : "El salón atiende de martes a sábado. Podés elegir otro día.");
  };
  const renderClients = (data) => window.DylanClients.render(data);
  const renderServices = (data) => {
    $("#service-list").innerHTML = data.services.map((s, index) => `<article class="admin-service-card"><span class="service-number">${String(index + 1).padStart(2, "0")}</span><h3>${escape(s.name)}</h3><p>${escape(s.description)}</p><div class="service-facts"><strong>${escape(s.price)}</strong><span>${s.duration} min</span></div><button type="button" class="button-outline" data-edit-service="${escape(s.id)}" aria-label="Editar ${escape(s.name)}">Editar servicio <span aria-hidden="true">↗</span></button></article>`).join("");
  };
  const render = () => {
    const data = store.get();
    $("#today-label").textContent = dateLabel(store.today(), { day: "numeric", month: "long" });
    $("#storage-note").hidden = store.storageAvailable();
    renderAgenda(data); renderClients(data); renderServices(data);
    window.DylanEditor.render(data);
  };
  const setView = (view) => {
    const changed = currentView !== view;
    currentView = view;
    const copy = {
      agenda: ["Tu día, en orden.", "Un vistazo a los turnos, más tiempo para hacer lo tuyo."],
      clientes: ["Conocé a tus clientes.", "Un panorama de sus visitas, sus preferencias y lo que viene."],
      servicios: ["La web, a tu manera.", "Tu catálogo, tus imágenes y tu forma de presentarte."],
    };
    document.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== view; });
    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    $("#view-title").textContent = copy[view][0];
    $("#view-description").textContent = copy[view][1];
    if (changed) window.scrollTo(0, 0);
  };
  const updateTimes = () => {
    const selectedTime = $("#appointment-time").value;
    const date = $("#appointment-date").value;
    const serviceId = $("#appointment-service").value;
    const times = store.allTimes.filter((time) => store.isAvailable(date, time, serviceId));
    $("#appointment-time").innerHTML = times.length ? `<option value="">Elegí un horario</option>${times.map((time) => `<option value="${time}">${time}</option>`).join("")}` : '<option value="">Sin horarios disponibles</option>';
    if (times.includes(selectedTime)) $("#appointment-time").value = selectedTime;
    $("#appointment-error").textContent = !store.isOpenDay(date) ? "Atendemos de martes a sábado. Elegí otro día." : times.length ? "" : "No hay espacio para este servicio en la fecha elegida.";
  };
  const openAppointment = () => {
    $("#appointment-form").reset();
    $("#appointment-error").textContent = "";
    $("#appointment-date").value = store.nextOpenDay(selectedDate);
    $("#appointment-service").innerHTML = store.get().services.map((s) => `<option value="${escape(s.id)}">${escape(s.name)} · ${s.duration} min</option>`).join("");
    updateTimes();
    $("#appointment-dialog").showModal();
    $("#appointment-name").focus();
  };
  const confirm = (title, copy, button, action) => {
    $("#confirm-title").textContent = title;
    $("#confirm-copy").textContent = copy;
    $("#confirm-submit").textContent = button;
    pendingConfirmation = action;
    $("#confirm-dialog").showModal();
  };
  document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.closeDialog).close()));
  $("#prev-day").addEventListener("click", () => { selectedDate = store.addDays(selectedDate, -1); render(); });
  $("#next-day").addEventListener("click", () => { selectedDate = store.addDays(selectedDate, 1); render(); });
  $("#today-button").addEventListener("click", () => { selectedDate = store.today(); render(); });
  $("#agenda-date").addEventListener("change", (event) => { if (event.target.value) { selectedDate = event.target.value; render(); } else event.target.value = selectedDate; });
  $("#status-filter").addEventListener("change", render);
  $("#new-appointment").addEventListener("click", openAppointment);
  $("#appointment-date").addEventListener("change", updateTimes);
  $("#appointment-service").addEventListener("change", updateTimes);
  $("#appointment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const appointment = store.createAppointment(Object.fromEntries(new FormData(event.currentTarget)));
      selectedDate = appointment.date;
      $("#appointment-dialog").close();
      setView("agenda"); render();
      toast("Turno de prueba guardado.");
    } catch (error) { $("#appointment-error").textContent = error.message; }
  });
  $("#appointment-list").addEventListener("click", (event) => {
    const complete = event.target.closest("[data-complete]");
    const cancel = event.target.closest("[data-cancel]");
    if (complete) {
      try { store.setStatus(complete.dataset.complete, "completed"); toast("Turno marcado como atendido."); }
      catch (error) { toast(error.message); }
    }
    if (cancel) {
      const appointment = store.get().appointments.find((a) => a.id === cancel.dataset.cancel);
      if (!appointment) return;
      confirm("¿Cancelar este turno?", `Se liberará el horario de ${appointment.client} del ${dateLabel(appointment.date)} a las ${appointment.time}.`, "Cancelar turno", () => {
        store.setStatus(appointment.id, "cancelled"); toast("Turno cancelado. El horario vuelve a estar disponible.");
      });
    }
  });
  $("#service-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-service]");
    if (!button) return;
    const service = store.get().services.find((s) => s.id === button.dataset.editService);
    if (!service) return;
    for (const key of ["id", "name", "price", "duration", "description"]) $(`#service-${key}`).value = service[key];
    $("#service-error").textContent = "";
    $("#service-dialog").showModal();
    $("#service-name").focus();
  });
  $("#service-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      store.saveService(Object.fromEntries(new FormData(event.currentTarget)));
      $("#service-dialog").close();
      toast("Servicio actualizado en esta demostración.");
    } catch (error) { $("#service-error").textContent = error.message; }
  });
  $("#reset-demo-data").addEventListener("click", () => confirm("¿Reiniciar la demostración?", "Se borrarán los turnos de prueba y los cambios en servicios, imágenes y textos de este navegador. Volverán los ejemplos iniciales.", "Reiniciar demo", () => {
    store.reset(); selectedDate = store.nextOpenDay(store.today());
    $("#status-filter").value = "all"; window.DylanClients.resetFilters(); window.DylanEditor.resetDraft();
    setView("agenda"); render(); toast("La demostración volvió al inicio.");
  }));
  $("#confirm-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try { pendingConfirmation?.(); } catch (error) { toast(error.message); }
    pendingConfirmation = null;
    $("#confirm-dialog").close();
  });
  store.subscribe(() => {
    render();
    if ($("#appointment-dialog").open) updateTimes();
  });
  window.addEventListener("pageshow", render);
  setView(currentView); render();
})();
