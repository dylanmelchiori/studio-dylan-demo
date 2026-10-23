/* Exportación manual de turnos de prueba; no conecta ni sincroniza cuentas. */
(() => {
  "use strict";

  const timezone = "America/Argentina/Buenos_Aires";
  const disclaimer = "Turno de demostración de Studio Dylan. No es una reserva real. Los cambios y cancelaciones de la web no actualizan este evento.";
  const durations = [30, 45, 60, 90, 120];
  const encoder = new TextEncoder();

  const text = (value) => String(value ?? "")
    .replace(/\r\n|\r|\u2028|\u2029/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");

  const utcDate = (value) => {
    if (!(value instanceof Date) && (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))) {
      throw new Error("El turno necesita una fecha UTC válida.");
    }
    const date = new Date(value instanceof Date ? value.getTime() : value);
    if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
      throw new Error("El turno necesita una fecha UTC válida.");
    }
    if (typeof value === "string" && date.toISOString() !== value && date.toISOString().replace(/\.000Z$/, "Z") !== value) {
      throw new Error("El turno necesita una fecha UTC válida.");
    }
    return date;
  };

  const timestamp = (value) => utcDate(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  const eventFromAppointment = (appointment, website, audience = "admin") => {
    if (!appointment || typeof appointment.id !== "string" || !appointment.id.trim()) throw new Error("No se encontró el turno para exportar.");
    if (["cancelled", "canceled"].includes(appointment.status)) throw new Error("Los turnos cancelados no se pueden agregar al calendario.");
    if (typeof appointment.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(appointment.date)) throw new Error("La fecha del turno no es válida.");
    const calendarDate = new Date(`${appointment.date}T12:00:00Z`);
    if (!Number.isFinite(calendarDate.getTime()) || calendarDate.getUTCFullYear() < 1 || calendarDate.toISOString().slice(0, 10) !== appointment.date) throw new Error("La fecha del turno no es válida.");
    if (typeof appointment.time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(appointment.time)) throw new Error("El horario del turno no es válido.");
    if (!durations.includes(appointment.duration)) throw new Error("La duración del turno no es válida.");

    // UTC-03 explícito: la exportación no depende de la zona horaria del dispositivo.
    const start = utcDate(new Date(`${appointment.date}T${appointment.time}:00-03:00`));
    const end = utcDate(new Date(start.getTime() + appointment.duration * 60000));
    const service = text(appointment.serviceName).trim() || "Turno";
    const client = text(appointment.client).trim();
    const title = audience === "customer"
      ? `PRUEBA · ${service} · Studio Dylan`
      : `PRUEBA · ${client ? `${client} · ` : ""}${service} · Studio Dylan`;
    const address = text(website?.address).trim();
    let uid;
    try { uid = `${encodeURIComponent(appointment.id)}@studio-dylan-demo.local`; }
    catch { throw new Error("El identificador del turno no es válido."); }
    return { uid, title, description: disclaimer, location: address && !/confirmar/i.test(address) ? address : "", start, end };
  };

  const normalizeEvent = (event) => {
    if (!event || typeof event.uid !== "string" || !event.uid.trim()) throw new Error("No se encontró el turno para exportar.");
    const start = utcDate(event.start), end = utcDate(event.end);
    if (end.getTime() <= start.getTime()) throw new Error("El final del turno debe ser posterior al inicio.");
    const originalTitle = text(event.title).trim();
    const title = /^PRUEBA · /u.test(originalTitle) ? originalTitle : `PRUEBA · ${originalTitle || "Studio Dylan"}`;
    // Se conserva el aviso incluso si alguien utiliza la API con un evento manual.
    const originalDescription = text(event.description).trim();
    const description = originalDescription.includes(disclaimer) ? originalDescription : `${disclaimer}${originalDescription ? `\n\n${originalDescription}` : ""}`;
    return { uid: text(event.uid), title, description, location: text(event.location).trim(), start, end };
  };

  const googleUrl = (input) => {
    const event = normalizeEvent(input);
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", event.title);
    url.searchParams.set("dates", `${timestamp(event.start)}/${timestamp(event.end)}`);
    url.searchParams.set("details", event.description);
    url.searchParams.set("location", event.location);
    url.searchParams.set("ctz", timezone);
    return url.toString();
  };

  const escapeIcs = (value) => text(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");

  // RFC 5545 §3.1: máximo 75 octetos físicos por línea, sin cortar UTF-8.
  const foldLine = (line) => {
    const lines = [];
    let current = "", length = 0;
    for (const character of line) {
      const size = encoder.encode(character).length;
      if (length + size > 75) {
        lines.push(current);
        current = " ";
        length = 1;
      }
      current += character;
      length += size;
    }
    lines.push(current);
    return lines.join("\r\n");
  };

  const ics = (events) => {
    if (!Array.isArray(events) || !events.length) throw new Error("Elegí al menos un turno para exportar.");
    const normalized = events.map(normalizeEvent);
    const stamp = timestamp(new Date());
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Studio Dylan//Turnos de demostracion//ES", "CALSCALE:GREGORIAN"];
    for (const event of normalized) {
      lines.push("BEGIN:VEVENT", `UID:${escapeIcs(event.uid)}`, `DTSTAMP:${stamp}`, `DTSTART:${timestamp(event.start)}`, `DTEND:${timestamp(event.end)}`, `SUMMARY:${escapeIcs(event.title)}`, `DESCRIPTION:${escapeIcs(event.description)}`);
      if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");
    return `${lines.map(foldLine).join("\r\n")}\r\n`;
  };

  const download = (events, filename = "studio-dylan-turnos-prueba.ics") => {
    const blob = new Blob([ics(events)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const base = text(filename).replace(/[\\/:*?"<>|\n]/g, "-").replace(/\.ics$/i, "").trim() || "studio-dylan-turnos-prueba";
    anchor.href = url;
    anchor.download = `${base}.ics`;
    anchor.hidden = true;
    try {
      document.body.append(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  window.DylanCalendarFiles = { eventFromAppointment, googleUrl, ics, download };
})();
