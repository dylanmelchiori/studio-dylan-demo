/* Directorio y métricas ilustrativas para recorrer el panel sin datos reales. */
(() => {
  "use strict";
  const store = window.DylanDemo;
  const panel = document.getElementById("panel-clientes");
  if (!store || !panel) return;
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es-AR");
  const dateLabel = (date, options = { day: "numeric", month: "short" }) => new Date(`${date}T12:00:00Z`).toLocaleDateString("es-AR", { ...options, timeZone: "America/Argentina/Buenos_Aires" });
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const daysSince = (date) => Math.round((Date.parse(`${store.today()}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 86400000);
  const serviceIds = ["corte-clasico", "corte-barba", "estilo-personal"];
  const serviceDefaults = { "corte-clasico": "Corte clásico", "corte-barba": "Corte + barba", "estilo-personal": "Estilo personal" };
  const seedProfiles = [
    { name: "Mateo Ruiz", visits: 12, lastDays: 18, interval: 27, favorite: "corte-clasico", preference: "Degradado suave y terminación natural.", since: "2024" },
    { name: "Tomás Fernández", visits: 14, lastDays: 25, interval: 24, favorite: "corte-barba", preference: "Conservar largo arriba. Barba corta y perfilada.", since: "2024" },
    { name: "Lucas Pérez", visits: 6, lastDays: 42, interval: 31, favorite: "corte-clasico", preference: "Laterales cortos, textura en la parte superior.", since: "2025" },
    { name: "Nicolás Díaz", visits: 2, lastDays: 15, interval: 38, favorite: "estilo-personal", preference: "Asesoramiento de estilo y peinado fácil de mantener.", since: "2026" },
    { name: "Valentín Acosta", visits: 9, lastDays: 9, interval: 25, favorite: "corte-barba", preference: "Corte clásico con barba prolija. Prefiere la mañana.", since: "2025" },
    { name: "Santiago López", visits: 4, lastDays: 94, interval: 35, favorite: "estilo-personal", preference: "Corte a tijera y acabado mate.", since: "2025" },
    { name: "Joaquín Castro", visits: 3, lastDays: 110, interval: 29, favorite: "corte-clasico", preference: "Degradado bajo. Prefiere turnos por la tarde.", since: "2026" },
    { name: "Bruno Medina", visits: 2, lastDays: 33, interval: 36, favorite: "corte-barba", preference: "Contornos suaves y barba con volumen natural.", since: "2026" },
  ];
  const segments = { all: "Todos los segmentos", new: "Nuevos", regular: "Habituales", recover: "Por recuperar" };
  const filterState = { search: "", segment: "all", service: "all", sort: "recent" };
  let currentClients = [];
  let currentData = store.get();
  const searchIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg>';
  const personIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>';
  panel.classList.add("clients-workspace");
  panel.innerHTML = `
    <div class="clients-overview-heading"><div><p class="eyebrow">LA RELACIÓN CON TUS CLIENTES</p><h2>Conocé a quienes vuelven.</h2></div><span class="clients-data-label"><span></span>Datos ilustrativos</span></div>
    <div class="clients-metrics" id="clients-metrics" aria-label="Resumen de clientes"></div>
    <div class="clients-charts">
      <section class="clients-chart-card" aria-labelledby="clients-visits-title"><div class="clients-chart-heading"><div><p class="clients-kicker">CADA VISITA CUENTA</p><h3 id="clients-visits-title">Visitas en los últimos meses</h3></div><span class="clients-chart-period">6 meses</span></div><div id="clients-visits-chart"></div><p class="clients-chart-note">Historial de ejemplo · no representa resultados reales.</p></section>
      <section class="clients-chart-card" aria-labelledby="clients-services-title"><div class="clients-chart-heading"><div><p class="clients-kicker">LO QUE MÁS ELIGEN</p><h3 id="clients-services-title">Servicios favoritos</h3></div></div><div id="clients-services-chart"></div><p class="clients-chart-note">Distribución de visitas ilustrativas del mismo período.</p></section>
    </div>
    <section class="clients-directory" aria-labelledby="clients-directory-title"><div class="clients-directory-heading"><div><p class="clients-kicker">TU COMUNIDAD</p><h3 id="clients-directory-title">Directorio de clientes</h3></div><span id="clients-results" class="clients-results" role="status" aria-live="polite"></span></div>
      <form class="clients-filters" id="clients-filter-form" role="search" aria-label="Filtrar clientes">
        <label class="clients-search">${searchIcon}<span class="sr-only">Buscar por nombre o teléfono</span><input id="clients-query" type="search" placeholder="Nombre o teléfono" autocomplete="off" /></label>
        <label class="clients-select"><span>Segmento</span><select id="clients-segment"><option value="all">Todos los segmentos</option><option value="new">Nuevos</option><option value="regular">Habituales</option><option value="recover">Por recuperar</option></select></label>
        <label class="clients-select"><span>Servicio habitual</span><select id="clients-service"><option value="all">Todos los servicios</option></select></label>
        <label class="clients-select"><span>Ordenar por</span><select id="clients-sort"><option value="recent">Última visita</option><option value="name">Nombre A–Z</option><option value="visits">Más visitas</option></select></label>
      </form>
      <div id="clients-active-filters" class="clients-active-filters" hidden></div>
      <div class="clients-table-head" aria-hidden="true"><span>CLIENTE / CONTACTO</span><span>ÚLTIMA VISITA</span><span>VISITAS</span><span>SERVICIO HABITUAL</span><span>SEGMENTO</span><span></span></div><div id="clients-directory-list" class="clients-directory-list"></div>
      <p class="clients-directory-note">Perfiles e historiales de ejemplo. Los clientes que agregues desde la agenda también aparecen acá.</p>
    </section>
    <dialog id="clients-profile-dialog" class="clients-profile-dialog" aria-labelledby="clients-profile-name"><div id="clients-profile-content"></div></dialog>`;
  const $ = (selector) => panel.querySelector(selector);

  const buildClients = (data) => {
    const serviceName = (id) => data.services.find((service) => service.id === id)?.name || serviceDefaults[id] || "Servicio";
    const clients = new Map(seedProfiles.map((profile, index) => {
      const history = Array.from({ length: profile.visits }, (_, visit) => {
        const serviceId = visit % 4 === 3 ? serviceIds[(serviceIds.indexOf(profile.favorite) + 1) % serviceIds.length] : profile.favorite;
        return { id: `illustrative-${index}-${visit}`, date: store.addDays(store.today(), -profile.lastDays - visit * profile.interval), serviceId, serviceName: serviceName(serviceId), status: "completed", illustrative: true };
      });
      return [normalize(profile.name), { ...profile, id: `profile-${index}`, phone: `11 0000 01${String(index + 1).padStart(2, "0")}`, illustrative: true, history, appointments: [] }];
    }));
    data.appointments.forEach((appointment) => {
      const key = normalize(appointment.client);
      if (!key) return;
      let client = clients.get(key);
      if (!client) {
        client = { id: `agenda-${appointment.id}`, name: appointment.client, phone: appointment.phone, preference: "Todavía no hay preferencias registradas.", illustrative: false, history: [], appointments: [] };
        clients.set(key, client);
      }
      if (appointment.phone) client.phone = appointment.phone;
      client.appointments.push(appointment);
      client.history.push({ ...appointment, serviceName: serviceName(appointment.serviceId), illustrative: false });
    });
    return [...clients.values()].map((client) => {
      const attended = client.history.filter((visit) => visit.status === "completed" && visit.date <= store.today());
      const last = attended.map((visit) => visit.date).sort().at(-1) || "";
      const counts = attended.reduce((result, visit) => { result[visit.serviceId] = (result[visit.serviceId] || 0) + 1; return result; }, {});
      const favorite = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || client.appointments.find((appointment) => appointment.status === "confirmed")?.serviceId || client.appointments[0]?.serviceId || "";
      const upcoming = client.appointments.filter((appointment) => appointment.status === "confirmed" && appointment.date >= store.today()).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
      const segment = last && daysSince(last) > 60 ? "recover" : attended.length >= 4 ? "regular" : "new";
      return { ...client, last, visits: attended.length, favorite, favoriteName: serviceName(favorite), upcoming, segment, history: client.history.sort((a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`)) };
    });
  };

  const renderMetrics = () => {
    const values = [
      ["Clientes en el directorio", currentClients.length, "Perfiles de esta demostración", personIcon],
      ["Clientes recurrentes", currentClients.filter((client) => client.visits >= 4).length, "Con 4 visitas o más", '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/></svg>'],
      ["Próximos turnos", currentClients.reduce((sum, client) => sum + client.upcoming.length, 0), "Confirmados desde hoy", '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18m-11 5 2 2 4-4"/></svg>'],
      ["Por recuperar", currentClients.filter((client) => client.segment === "recover").length, "Más de 60 días sin visitar", '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'],
    ];
    $("#clients-metrics").innerHTML = values.map(([label, value, note, icon], index) => `<article class="clients-metric ${index === 3 ? "clients-metric-warm" : ""}"><div class="clients-metric-top"><span>${label}</span>${icon}</div><strong>${value}</strong><p>${note}</p></article>`).join("");
  };
  const renderCharts = () => {
    const currentMonth = new Date(`${store.today().slice(0, 7)}-01T12:00:00Z`);
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(currentMonth);
      date.setUTCMonth(date.getUTCMonth() - 5 + index);
      return { key: date.toISOString().slice(0, 7), label: date.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }).replace(".", ""), count: 0 };
    });
    const visits = currentClients.flatMap((client) => client.history.filter((visit) => visit.illustrative && months.some((month) => visit.date.startsWith(month.key))));
    visits.forEach((visit) => { const month = months.find((item) => visit.date.startsWith(item.key)); if (month) month.count += 1; });
    const max = Math.max(...months.map((month) => month.count), 1);
    $("#clients-visits-chart").innerHTML = `<div class="clients-bar-chart" role="img" aria-label="Visitas ilustrativas: ${escape(months.map((month) => `${month.label}: ${month.count}`).join(", "))}">${months.map((month, index) => `<div class="clients-chart-column"><div class="clients-chart-track"><span class="clients-bar ${index === 5 ? "is-current" : ""}" style="height:${Math.max(4, month.count / max * 100)}%"><span>${month.count}</span></span></div><span class="clients-month">${escape(month.label)}</span></div>`).join("")}</div>`;
    const total = visits.length;
    const counts = serviceIds.map((id) => ({ id, name: currentData.services.find((service) => service.id === id)?.name || serviceDefaults[id], count: visits.filter((visit) => visit.serviceId === id).length }));
    const percentages = counts.map((service) => total ? service.count / total * 100 : 0);
    const stops = [percentages[0], percentages[0] + percentages[1]];
    $("#clients-services-chart").innerHTML = `<div class="clients-service-chart"><div class="clients-donut" style="background:conic-gradient(#17574c 0 ${stops[0]}%,#91ad98 ${stops[0]}% ${stops[1]}%,#d6b08b ${stops[1]}% 100%)" aria-hidden="true"><div><strong>${total}</strong><span>visitas</span></div></div><ul class="clients-chart-legend">${counts.map((service, index) => `<li><span class="clients-legend-dot clients-dot-${index}"></span><span>${escape(service.name)}</span><strong>${Math.round(percentages[index])}%</strong></li>`).join("")}</ul></div>`;
  };
  const renderDirectory = () => {
    const term = normalize(filterState.search);
    const phoneTerm = term.replace(/\D/g, "");
    const clients = currentClients.filter((client) => (!term || normalize(`${client.name} ${client.phone}`).includes(term) || (phoneTerm.length >= 3 && client.phone.replace(/\D/g, "").includes(phoneTerm))) && (filterState.segment === "all" || client.segment === filterState.segment) && (filterState.service === "all" || client.favorite === filterState.service));
    clients.sort((a, b) => filterState.sort === "name" ? a.name.localeCompare(b.name, "es") : filterState.sort === "visits" ? b.visits - a.visits || a.name.localeCompare(b.name, "es") : (b.last || "").localeCompare(a.last || "") || a.name.localeCompare(b.name, "es"));
    $("#clients-results").textContent = `${clients.length} de ${currentClients.length} clientes`;
    const active = [];
    if (filterState.search.trim()) active.push(["search", `Búsqueda: ${filterState.search.trim()}`]);
    if (filterState.segment !== "all") active.push(["segment", segments[filterState.segment]]);
    if (filterState.service !== "all") active.push(["service", currentData.services.find((service) => service.id === filterState.service)?.name || serviceDefaults[filterState.service] || "Servicio"]);
    if (filterState.sort !== "recent") active.push(["sort", filterState.sort === "name" ? "Nombre A–Z" : "Más visitas"]);
    $("#clients-active-filters").hidden = !active.length;
    $("#clients-active-filters").innerHTML = active.map(([key, label]) => `<button type="button" class="clients-filter-chip" data-remove-filter="${key}" aria-label="Quitar filtro ${escape(label)}">${escape(label)} <span aria-hidden="true">×</span></button>`).join("") + (active.length ? '<button type="button" class="clients-clear-filters" data-clear-filters>Limpiar filtros</button>' : "");
    $("#clients-directory-list").innerHTML = clients.length ? clients.map((client) => `<article class="clients-directory-row"><div class="clients-person"><span class="clients-person-avatar" aria-hidden="true">${escape(initials(client.name))}</span><div><h4>${escape(client.name)}</h4><p>${escape(client.phone || "Sin teléfono cargado")}</p></div></div><div class="clients-cell clients-cell-date"><span class="clients-mobile-label">Última visita</span><strong>${client.last ? escape(dateLabel(client.last)) : "Sin visitas"}</strong><small>${client.last ? daysSince(client.last) === 0 ? "Hoy" : `Hace ${daysSince(client.last)} días` : "Primera reserva"}</small></div><div class="clients-cell clients-cell-visits"><span class="clients-mobile-label">Visitas</span><strong>${client.visits}</strong></div><div class="clients-cell clients-cell-service"><span class="clients-mobile-label">Servicio habitual</span><span>${escape(client.favoriteName)}</span></div><div class="clients-cell-segment"><span class="clients-segment-badge clients-segment-${client.segment}">${segments[client.segment]}</span></div><button type="button" class="clients-profile-button" data-client-profile="${escape(client.id)}" aria-label="Ver ficha de ${escape(client.name)}">Ver ficha <span aria-hidden="true">↗</span></button></article>`).join("") : '<div class="clients-no-results"><span aria-hidden="true">⌕</span><h4>No encontramos clientes</h4><p>Probá otra búsqueda o quitá algún filtro.</p><button class="clients-profile-button" type="button" data-clear-filters>Limpiar filtros</button></div>';
  };
  const syncControls = () => {
    $("#clients-query").value = filterState.search;
    $("#clients-segment").value = filterState.segment;
    $("#clients-service").value = filterState.service;
    $("#clients-sort").value = filterState.sort;
  };
  const resetFilters = () => {
    Object.assign(filterState, { search: "", segment: "all", service: "all", sort: "recent" });
    syncControls();
    renderDirectory();
  };
  const openProfile = (id) => {
    const client = currentClients.find((item) => item.id === id);
    if (!client) return;
    const upcoming = client.upcoming[0];
    const notes = client.appointments.filter((appointment) => appointment.notes).map((appointment) => appointment.notes);
    const historyLabels = { completed: "Atendido", confirmed: "Confirmado", cancelled: "Cancelado" };
    $("#clients-profile-content").innerHTML = `<div class="clients-profile-heading"><span class="clients-person-avatar" aria-hidden="true">${escape(initials(client.name))}</span><button type="button" class="clients-profile-close" data-close-client aria-label="Cerrar ficha">×</button></div><p class="clients-kicker">FICHA DEL CLIENTE · DEMOSTRACIÓN</p><h2 id="clients-profile-name">${escape(client.name)}</h2><p class="clients-profile-contact">${escape(client.phone || "Sin teléfono cargado")}</p><span class="clients-segment-badge clients-segment-${client.segment}">${segments[client.segment]}</span><div class="clients-profile-facts"><div><strong>${client.visits}</strong><span>visitas registradas</span></div><div><strong>${client.last ? escape(dateLabel(client.last)) : "—"}</strong><span>última visita</span></div><div><strong>${client.upcoming.length}</strong><span>próximos turnos</span></div></div>${upcoming ? `<div class="clients-next-appointment"><span>PRÓXIMO ENCUENTRO</span><strong>${escape(dateLabel(upcoming.date, { weekday: "short", day: "numeric", month: "long" }))} · ${escape(upcoming.time)}</strong><p>${escape(upcoming.serviceName)}</p></div>` : ""}<section class="clients-profile-preferences"><h3>Preferencias y notas</h3><p>${escape(client.preference)}</p>${notes.length ? `<p class="clients-agenda-note"><strong>Desde la agenda:</strong> ${escape(notes.at(-1))}</p>` : ""}${client.illustrative ? '<small>Preferencias ilustrativas para mostrar esta ficha.</small>' : ""}</section><section class="clients-profile-history"><h3>Actividad reciente</h3><ul>${client.history.slice(0, 5).map((visit) => `<li><div><strong>${escape(visit.serviceName)}</strong><span>${escape(dateLabel(visit.date, { day: "numeric", month: "short", year: "numeric" }))}${visit.illustrative ? " · Ejemplo" : " · Agenda demo"}</span></div><span class="clients-history-status clients-history-${escape(visit.status)}">${historyLabels[visit.status] || "Registrado"}</span></li>`).join("")}</ul><p class="clients-profile-disclaimer">${client.illustrative ? "Perfil e historial ilustrativos; no son datos reales del salón." : "Cliente creado desde los turnos de esta demostración."}</p></section><button type="button" class="clients-profile-done" data-close-client>Cerrar ficha</button>`;
    $("#clients-profile-dialog").showModal();
  };
  const render = (data = store.get()) => {
    currentData = data;
    currentClients = buildClients(data);
    $("#clients-service").innerHTML = '<option value="all">Todos los servicios</option>' + data.services.map((service) => `<option value="${escape(service.id)}">${escape(service.name)}</option>`).join("");
    if (filterState.service !== "all" && !data.services.some((service) => service.id === filterState.service)) filterState.service = "all";
    syncControls();
    renderMetrics(); renderCharts(); renderDirectory();
  };
  $("#clients-filter-form").addEventListener("submit", (event) => event.preventDefault());
  $("#clients-query").addEventListener("input", (event) => { filterState.search = event.target.value; renderDirectory(); });
  [["#clients-segment", "segment"], ["#clients-service", "service"], ["#clients-sort", "sort"]].forEach(([selector, key]) => $(selector).addEventListener("change", (event) => { filterState[key] = event.target.value; renderDirectory(); }));
  panel.addEventListener("click", (event) => {
    const profile = event.target.closest("[data-client-profile]");
    const remove = event.target.closest("[data-remove-filter]");
    if (profile) openProfile(profile.dataset.clientProfile);
    if (event.target.closest("[data-clear-filters]")) resetFilters();
    if (remove) { const key = remove.dataset.removeFilter; filterState[key] = key === "search" ? "" : key === "sort" ? "recent" : "all"; syncControls(); renderDirectory(); }
    if (event.target.closest("[data-close-client]")) $("#clients-profile-dialog").close();
  });
  $("#clients-profile-dialog").addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
  });
  window.DylanClients = { render, resetFilters };
  render();
})();
