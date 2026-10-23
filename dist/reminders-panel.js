/* Vista de demostración. Este módulo no conecta WhatsApp ni envía mensajes. */
(() => {
  "use strict";

  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const icon = (name) => {
    const paths = {
      message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8.5 9h7m-7 4h5"/>',
      calendar: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-12 4h3m3 0h2"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      eye: '<path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${paths[name] || paths.message}</svg>`;
  };
  const rules = [
    { id: "confirmation", title: "Al confirmar la reserva", detail: "Una bienvenida con los datos del turno.", timing: "Al confirmar", icon: "message" },
    { id: "dayBefore", title: "Un día antes", detail: "Un recordatorio 24 horas antes del turno.", timing: "24 h antes", icon: "calendar" },
    { id: "sameDay", title: "El mismo día", detail: "Un aviso 2 horas antes de la visita.", timing: "2 h antes", icon: "clock" },
  ];
  const defaultDraft = () => ({
    active: { confirmation: true, dayBefore: true, sameDay: false },
    type: "dayBefore", client: "", start: "09:00", end: "20:00",
    templates: {
      confirmation: "¡Hola, {nombre}! Tu turno en {estudio} está confirmado.\n\n✂ {servicio}\n📅 {fecha} a las {hora} h\n\n¡Te esperamos!",
      dayBefore: "¡Hola, {nombre}! Te recordamos tu turno en {estudio}.\n\n✂ {servicio}\n📅 {fecha} a las {hora} h\n\nSi necesitás cambiar el horario, escribinos por acá. ¡Nos vemos!",
      sameDay: "¡Hola, {nombre}! Hoy te esperamos en {estudio} para tu {servicio}.\n\n📅 {fecha} a las {hora} h\n\n¡Hasta dentro de un ratito!",
    },
  });
  let draft = defaultDraft();
  let latestData = { appointments: [], website: {} };
  let workspace;
  let dialog;
  let dialogMode = "";
  let saved = false;

  const dateObject = (date, time = "12:00") => /^\d{4}-\d{2}-\d{2}$/.test(date || "") && /^\d{2}:\d{2}$/.test(time || "") ? new Date(`${date}T${time}:00-03:00`) : new Date(NaN);
  const dateLabel = (date, options = { weekday: "long", day: "numeric", month: "long" }) => {
    const value = dateObject(date);
    return Number.isNaN(value.getTime()) ? "Fecha por definir" : value.toLocaleDateString("es-AR", { ...options, timeZone: "America/Argentina/Buenos_Aires" });
  };
  const confirmed = () => (Array.isArray(latestData.appointments) ? latestData.appointments : []).filter((item) => item?.status === "confirmed" && !Number.isNaN(dateObject(item.date, item.time).getTime())).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const selectedAppointment = () => confirmed().find((appointment) => String(appointment.id) === draft.client);
  const rule = () => rules.find((item) => item.id === draft.type);
  const renderedMessage = (appointment) => {
    if (!appointment) return "Tu mensaje aparecerá acá cuando haya un turno confirmado en la demo.";
    const values = {
      nombre: String(appointment.client || "Cliente").trim().split(/\s+/)[0],
      servicio: appointment.serviceName || "Servicio", fecha: dateLabel(appointment.date),
      hora: appointment.time || "—", estudio: "Studio Dylan",
    };
    return draft.templates[draft.type].replace(/\{(nombre|servicio|fecha|hora|estudio)\}/g, (_, key) => values[key]);
  };
  const initials = (name) => String(name || "SD").trim().split(/\s+/).slice(0, 2).map((word) => word[0] || "").join("").toUpperCase();
  const find = (selector) => workspace?.querySelector(selector);
  const setStatus = (message = "") => {
    const node = find("#reminders-save-status");
    if (!node) return;
    node.textContent = message;
    node.hidden = !message;
  };
  const markChanged = () => {
    saved = false;
    const indicator = find("[data-reminders-draft]");
    if (indicator) indicator.textContent = "Configuración de ejemplo";
    setStatus();
  };
  const syncRules = () => {
    rules.forEach((item) => {
      const button = find(`[data-reminders-rule="${item.id}"]`);
      if (!button) return;
      button.setAttribute("aria-checked", String(draft.active[item.id]));
      button.querySelector(".reminders-switch-label").textContent = draft.active[item.id] ? "Activado en demo" : "Desactivado";
      button.closest(".reminders-rule").classList.toggle("is-enabled", draft.active[item.id]);
    });
    const label = find("[data-reminders-rule-count]");
    if (label) label.textContent = `${Object.values(draft.active).filter(Boolean).length} de 3 en esta demo`;
    const previewState = find("[data-reminders-preview-state]");
    if (previewState) {
      previewState.textContent = draft.active[draft.type] ? "Regla activada en demo" : "Regla desactivada";
      previewState.classList.toggle("is-disabled", !draft.active[draft.type]);
    }
  };
  const syncPreview = () => {
    const appointment = selectedAppointment();
    const copy = find("[data-reminders-message]");
    if (copy) copy.textContent = renderedMessage(appointment);
    const label = find("[data-reminders-preview-timing]");
    if (label) label.textContent = rule().timing;
    const recipient = find("[data-reminders-recipient]");
    if (recipient) recipient.textContent = appointment ? `Ejemplo con ${appointment.client}` : "Sin turno de ejemplo";
    const count = find("[data-reminders-character-count]");
    if (count) count.textContent = `${draft.templates[draft.type].length} / 700`;
    const simulate = find("#reminders-simulate");
    if (simulate) simulate.disabled = !appointment;
    syncRules();
    if (dialog?.open && dialogMode === "simulation") updateSimulation();
  };
  const momentLabel = (appointment, type) => {
    if (type === "confirmation") return "Al confirmar la reserva";
    const milliseconds = dateObject(appointment.date, appointment.time).getTime() - (type === "dayBefore" ? 24 : 2) * 60 * 60 * 1000;
    return new Date(milliseconds).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }) + " h";
  };
  const syncExamples = () => {
    const container = find("#reminders-examples");
    if (!container) return;
    const appointments = confirmed().filter((appointment) => dateObject(appointment.date, appointment.time).getTime() > Date.now()).slice(0, 3);
    if (!appointments.length) {
      container.innerHTML = `<div class="reminders-empty">${icon("calendar")}<h3>Sin próximos turnos para mostrar</h3><p>Agregá un turno futuro en la agenda para ver cómo se presentaría su recordatorio.</p></div>`;
      return;
    }
    const exampleRules = [rules[1], rules[2], rules[0]];
    container.innerHTML = appointments.map((appointment, index) => {
      const item = exampleRules[index];
      const enabled = draft.active[item.id];
      return `<article class="reminders-example"><div class="reminders-example-client"><span class="reminders-avatar" aria-hidden="true">${escape(initials(appointment.client))}</span><div><h3>${escape(appointment.client)}</h3><p>${escape(appointment.serviceName)}</p></div></div><div class="reminders-example-date"><span class="reminders-mobile-label">Turno</span><strong>${escape(dateLabel(appointment.date, { day: "numeric", month: "short" }))} · ${escape(appointment.time)} h</strong><span>Horario de Argentina</span></div><div class="reminders-example-moment"><span class="reminders-mobile-label">Recordatorio de ejemplo</span><strong>${escape(momentLabel(appointment, item.id))}</strong><span>${escape(item.timing)}</span></div><span class="reminders-example-state ${enabled ? "" : "is-disabled"}">${enabled ? "Simulado" : "Desactivado"}</span></article>`;
    }).join("");
  };
  const syncClients = () => {
    const select = find("#reminders-preview-client");
    if (!select) return;
    const appointments = confirmed();
    if (!appointments.some((appointment) => String(appointment.id) === draft.client)) draft.client = appointments.length ? String(appointments[0].id) : "";
    select.innerHTML = appointments.length ? appointments.map((appointment) => `<option value="${escape(appointment.id)}">${escape(appointment.client)} · ${escape(dateLabel(appointment.date, { day: "numeric", month: "short" }))} · ${escape(appointment.time)} h</option>`).join("") : '<option value="">Sin turnos confirmados</option>';
    select.value = draft.client;
    select.disabled = !appointments.length;
  };
  const closeDialog = () => dialog?.close();
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "dylan-reminders-dialog";
    dialog.className = "reminders-dialog";
    dialog.setAttribute("aria-labelledby", "reminders-dialog-title");
    document.body.append(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target.closest("[data-reminders-close]")) closeDialog();
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
      }
    });
    dialog.addEventListener("close", () => { dialogMode = ""; });
    return dialog;
  };
  const dialogHeader = (eyebrow, title) => `<div class="reminders-dialog-heading"><div><p class="reminders-eyebrow">${eyebrow}</p><h2 id="reminders-dialog-title">${title}</h2></div><button class="reminders-close" type="button" data-reminders-close aria-label="Cerrar">${icon("close")}</button></div>`;
  const openConnection = () => {
    ensureDialog();
    dialogMode = "connection";
    dialog.innerHTML = `${dialogHeader("EL PRÓXIMO PASO", "Conectar WhatsApp")}<span class="reminders-pending">Pendiente de conexión</span><p class="reminders-dialog-intro">Así se verá el recorrido para activar los recordatorios del estudio.</p><ol class="reminders-connection-steps"><li><span>01</span><div><h3>Elegí el número del estudio</h3><p>Definí desde qué WhatsApp se comunicarán con tus clientes.</p></div></li><li><span>02</span><div><h3>Vinculá tu WhatsApp</h3><p>La conexión se preparará en la próxima etapa del proyecto.</p></div></li><li><span>03</span><div><h3>Activá tus recordatorios</h3><p>Revisá los mensajes y elegí cuándo querés que lleguen.</p></div></li></ol><p class="reminders-dialog-note">Esta pantalla es una presentación. Todavía no se vincula ninguna cuenta ni se envían mensajes.</p><div class="reminders-dialog-footer"><button class="reminders-button reminders-button-primary" type="button" data-reminders-close>Entendido</button></div>`;
    if (!dialog.open) dialog.showModal();
  };
  const updateSimulation = () => {
    const appointment = selectedAppointment();
    const message = dialog.querySelector("[data-reminders-simulation-message]");
    if (message) message.textContent = renderedMessage(appointment);
    const recipient = dialog.querySelector("[data-reminders-simulation-recipient]");
    if (recipient) recipient.textContent = appointment ? `${appointment.client} · ${rule().timing}` : "El turno de ejemplo ya no está disponible.";
    const state = dialog.querySelector("[data-reminders-simulation-state]");
    if (state) state.textContent = draft.active[draft.type] ? "Regla activada en esta demo." : "Esta regla está desactivada. Podés revisar su mensaje igual.";
  };
  const openSimulation = () => {
    if (!selectedAppointment()) return;
    ensureDialog();
    dialogMode = "simulation";
    dialog.innerHTML = `${dialogHeader("SOLO VISTA PREVIA", "Así se vería el mensaje")}<p class="reminders-dialog-intro" data-reminders-simulation-recipient></p><div class="reminders-simulation-message" data-reminders-simulation-message></div><p class="reminders-simulation-state" data-reminders-simulation-state></p><p class="reminders-dialog-note">Simulación visual. No se envió ningún mensaje ni se contactó al cliente.</p><div class="reminders-dialog-footer"><button class="reminders-button reminders-button-primary" type="button" data-reminders-close>Volver al diseño</button></div>`;
    updateSimulation();
    if (!dialog.open) dialog.showModal();
  };
  const insertToken = (token) => {
    const textarea = find("#reminders-template");
    const value = draft.templates[draft.type];
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? start;
    const updated = value.slice(0, start) + token + value.slice(end);
    if (updated.length > 700) {
      setStatus("El mensaje de ejemplo admite hasta 700 caracteres.");
      return;
    }
    draft.templates[draft.type] = updated;
    textarea.value = updated;
    textarea.focus();
    textarea.setSelectionRange(start + token.length, start + token.length);
    markChanged();
    syncPreview();
  };
  const ensureWorkspace = () => {
    if (workspace) return workspace;
    const panel = document.getElementById("panel-recordatorios");
    if (!panel) return null;
    workspace = document.createElement("div");
    workspace.className = "reminders-workspace";
    panel.append(workspace);
    workspace.innerHTML = `
      <p class="reminders-demo-strip"><span aria-hidden="true"></span>Vista de demostración <i aria-hidden="true">·</i> WhatsApp no conectado <i aria-hidden="true">·</i> No se envían mensajes</p>
      <section class="reminders-connection" aria-labelledby="reminders-connection-title"><div class="reminders-connection-icon">${icon("message")}</div><div class="reminders-connection-copy"><p class="reminders-eyebrow">MÁS CERCA DE TUS CLIENTES</p><div class="reminders-connection-title"><h2 id="reminders-connection-title">Un mensaje a tiempo.</h2><span class="reminders-pending">Pendiente de conexión</span></div><p>Confirmaciones y recordatorios de turnos, desde el WhatsApp de tu estudio.</p></div><button id="reminders-connect" type="button" class="reminders-button reminders-button-primary">Conectar WhatsApp ${icon("arrow")}</button></section>
      <div class="reminders-builder"><div class="reminders-settings">
        <section class="reminders-card reminders-rules-card" aria-labelledby="reminders-rules-title"><div class="reminders-card-header"><div><p class="reminders-eyebrow">01 · CUÁNDO RECORDAR</p><h2 id="reminders-rules-title">En el momento justo</h2></div><span class="reminders-card-caption" data-reminders-rule-count></span></div><div class="reminders-rules">${rules.map((item) => `<div class="reminders-rule"><span class="reminders-rule-icon">${icon(item.icon)}</span><div class="reminders-rule-copy"><h3 id="reminders-rule-${item.id}-label">${escape(item.title)}${item.id !== "confirmation" ? ` <span>${item.timing}</span>` : ""}</h3><p>${escape(item.detail)}</p></div><button type="button" class="reminders-switch" role="switch" aria-checked="false" aria-labelledby="reminders-rule-${item.id}-label" data-reminders-rule="${item.id}"><span class="reminders-switch-track" aria-hidden="true"><span></span></span><span class="reminders-switch-label">Desactivado</span></button></div>`).join("")}</div><p class="reminders-card-footnote">Horarios propuestos para explorar el diseño. Los envíos todavía no están activos.</p></section>
        <section class="reminders-card reminders-editor-card" aria-labelledby="reminders-editor-title"><div class="reminders-card-header"><div><p class="reminders-eyebrow">02 · TU FORMA DE DECIRLO</p><h2 id="reminders-editor-title">Un mensaje con tu estilo</h2></div></div><div class="reminders-editor-body"><label class="reminders-field" for="reminders-message-type">Tipo de mensaje<select id="reminders-message-type">${rules.map((item) => `<option value="${item.id}">${escape(item.title)}${item.id !== "confirmation" ? ` (${escape(item.timing)})` : ""}</option>`).join("")}</select></label><div class="reminders-textarea-label"><label for="reminders-template">Mensaje de ejemplo</label><span data-reminders-character-count></span></div><textarea id="reminders-template" rows="7" maxlength="700" aria-describedby="reminders-token-help"></textarea><p id="reminders-token-help" class="reminders-token-help">Personalizalo con los datos de cada turno:</p><div class="reminders-tokens" aria-label="Insertar datos en el mensaje">${["nombre", "servicio", "fecha", "hora", "estudio"].map((token) => `<button type="button" data-reminders-token="{${token}}" aria-label="Insertar ${token}">{${token}}</button>`).join("")}</div><div class="reminders-time-window"><div>${icon("clock")}<div><strong>Franja preferida</strong><span>Horario de Argentina · ejemplo editable</span></div></div><div class="reminders-hours"><label><span class="sr-only">Desde</span><select id="reminders-start-hour" aria-label="Franja preferida desde">${Array.from({ length: 24 }, (_, index) => `<option value="${String(index).padStart(2, "0")}:00">${String(index).padStart(2, "0")}:00</option>`).join("")}</select></label><span>a</span><label><span class="sr-only">Hasta</span><select id="reminders-end-hour" aria-label="Franja preferida hasta">${Array.from({ length: 24 }, (_, index) => `<option value="${String(index).padStart(2, "0")}:00">${String(index).padStart(2, "0")}:00</option>`).join("")}</select></label></div></div></div><div class="reminders-save-row"><span data-reminders-draft>Configuración de ejemplo</span><button id="reminders-save" type="button" class="reminders-button reminders-button-primary">Guardar configuración de prueba</button><p id="reminders-save-status" role="status" aria-live="polite" hidden></p></div></section>
      </div><aside class="reminders-preview-card" aria-labelledby="reminders-preview-title"><div class="reminders-card-header"><div><p class="reminders-eyebrow">03 · ASÍ LO VERÍAN</p><h2 id="reminders-preview-title">Del otro lado del mensaje</h2></div></div><div class="reminders-preview-body"><label class="reminders-field" for="reminders-preview-client">Turno para la vista previa<select id="reminders-preview-client"></select></label><div class="reminders-phone"><div class="reminders-phone-status"><span>9:41</span><span class="reminders-phone-speaker" aria-hidden="true"></span><span aria-hidden="true">▰</span></div><div class="reminders-phone-header"><span aria-hidden="true">‹</span><div class="reminders-phone-avatar">SD</div><div><strong>Studio Dylan</strong><span>Vista previa del chat</span></div><span class="reminders-phone-more" aria-hidden="true">⋮</span></div><div class="reminders-chat"><span class="reminders-chat-label">SIMULACIÓN</span><div class="reminders-bubble"><p data-reminders-message></p><span class="reminders-bubble-meta">Ejemplo de mensaje</span></div><p class="reminders-chat-note">No se envían mensajes desde esta demo.</p></div><div class="reminders-phone-bottom" aria-hidden="true"><span>+</span><span>Mensaje</span><span>♩</span></div><div class="reminders-phone-home" aria-hidden="true"></div></div><div class="reminders-preview-details"><p data-reminders-recipient></p><div><span data-reminders-preview-timing></span><span class="reminders-preview-state" data-reminders-preview-state></span></div></div><button id="reminders-simulate" type="button" class="reminders-button reminders-button-secondary">${icon("eye")} Ver simulación</button><p class="reminders-preview-note">Probá el texto con los datos de tu agenda. No se contactará al cliente.</p></div></aside></div>
      <section class="reminders-card reminders-examples-card" aria-labelledby="reminders-examples-title"><div class="reminders-card-header"><div><p class="reminders-eyebrow">UN VISTAZO A LO QUE VIENE</p><h2 id="reminders-examples-title">Recordatorios de ejemplo</h2><p class="reminders-examples-description">Una muestra de cómo se verían los avisos de tus próximos turnos. No hay envíos programados.</p></div><span class="reminders-example-tag">SOLO DEMO</span></div><div class="reminders-example-columns" aria-hidden="true"><span>CLIENTE Y SERVICIO</span><span>TURNO</span><span>MOMENTO DEL AVISO</span><span>ESTADO</span></div><div id="reminders-examples"></div><p class="reminders-card-footnote">Las reglas y mensajes se conservan únicamente mientras esta página siga abierta.</p></section>`;
    workspace.querySelectorAll("[data-reminders-rule]").forEach((button) => button.addEventListener("click", () => {
      draft.active[button.dataset.remindersRule] = !draft.active[button.dataset.remindersRule];
      markChanged(); syncPreview(); syncExamples();
    }));
    find("#reminders-message-type").addEventListener("change", (event) => {
      draft.type = event.target.value;
      find("#reminders-template").value = draft.templates[draft.type];
      syncPreview();
    });
    find("#reminders-preview-client").addEventListener("change", (event) => { draft.client = event.target.value; syncPreview(); });
    find("#reminders-template").addEventListener("input", (event) => { draft.templates[draft.type] = event.target.value.slice(0, 700); markChanged(); syncPreview(); });
    workspace.querySelectorAll("[data-reminders-token]").forEach((button) => button.addEventListener("click", () => insertToken(button.dataset.remindersToken)));
    find("#reminders-start-hour").addEventListener("change", (event) => { draft.start = event.target.value; markChanged(); });
    find("#reminders-end-hour").addEventListener("change", (event) => { draft.end = event.target.value; markChanged(); });
    find("#reminders-connect").addEventListener("click", openConnection);
    find("#reminders-simulate").addEventListener("click", openSimulation);
    find("#reminders-save").addEventListener("click", () => {
      saved = true;
      find("[data-reminders-draft]").textContent = "Ejemplo guardado en esta vista";
      setStatus("Guardado en esta vista; no se enviarán mensajes.");
    });
    find("#reminders-message-type").value = draft.type;
    find("#reminders-template").value = draft.templates[draft.type];
    find("#reminders-start-hour").value = draft.start;
    find("#reminders-end-hour").value = draft.end;
    return workspace;
  };
  const render = (data) => {
    if (data && typeof data === "object") latestData = data;
    if (!ensureWorkspace()) return;
    syncClients(); syncPreview(); syncExamples();
  };
  const resetDraft = () => {
    draft = defaultDraft(); saved = false;
    if (dialog?.open) dialog.close();
    if (workspace) {
      find("#reminders-message-type").value = draft.type;
      find("#reminders-template").value = draft.templates[draft.type];
      find("#reminders-start-hour").value = draft.start;
      find("#reminders-end-hour").value = draft.end;
      markChanged();
    }
    render(latestData);
  };
  window.DylanReminders = { render, resetDraft };
})();
