/* Datos de demostración compartidos por la página y el panel en este navegador. */
(() => {
  "use strict";
  const key = "studio-dylan-demo-v1";
  const listeners = new Set();
  let persistent = true;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const addDays = (date, days) => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  };
  const validDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  const isOpenDay = (date) => validDate(date) && [2, 3, 4, 5, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay());
  const nextOpenDay = (date) => {
    let value = date;
    while (!isOpenDay(value)) value = addDays(value, 1);
    return value;
  };
  const minutes = (time) => /^\d{2}:\d{2}$/.test(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : -1;
  const allTimes = Array.from({ length: 20 }, (_, index) => 540 + index * 30)
    .filter((value) => value < 780 || value >= 900)
    .map((value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`);
  const websiteDefaults = () => ({
    heroTitle: "Tu corte.\nTu momento.", heroCopy: "Elegí un día, encontrá tu horario y reservá en menos de un minuto.",
    imprintTitle: publicContent.imprint.title, imprintCopy: publicContent.imprint.copy,
    name: publicContent.imprint.name, quote: publicContent.imprint.quote, detail: publicContent.imprint.detail,
    address: "Dirección y barrio a confirmar", whatsapp: "", instagram: "",
    heroImage: "", heroImageAlt: "Interior de Studio Dylan",
    profileImage: publicContent.imprint.photo, profileImageAlt: "Dylan, estilista en Studio Dylan",
  });
  const websiteLimits = { heroTitle: 120, heroCopy: 300, imprintTitle: 180, imprintCopy: 600, name: 80, quote: 180, detail: 300, address: 180, whatsapp: 40, instagram: 80, heroImageAlt: 160, profileImageAlt: 160 };
  const safeImage = (value) => typeof value === "string" && value.length <= 1800000 && (value === "" || /^assets\/[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/i.test(value) || /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(value));
  const normalizeWebsite = (input) => {
    const result = websiteDefaults();
    if (!input || typeof input !== "object") return result;
    for (const [field, max] of Object.entries(websiteLimits)) if (typeof input[field] === "string") result[field] = input[field].slice(0, max);
    for (const field of ["heroImage", "profileImage"]) if (safeImage(input[field])) result[field] = input[field];
    return result;
  };
  const seed = () => {
    const date = nextOpenDay(today());
    return {
      version: 1,
      website: websiteDefaults(),
      services: clone(publicContent.services),
      appointments: [
        { id: "sample-1", client: "Mateo Ruiz", phone: "", date, time: "09:00", serviceId: "corte-clasico", serviceName: "Corte clásico", duration: 45, status: "completed", notes: "", source: "example" },
        { id: "sample-2", client: "Tomás Fernández", phone: "", date, time: "10:30", serviceId: "corte-barba", serviceName: "Corte + barba", duration: 60, status: "confirmed", notes: "Dejar un poco de largo arriba.", source: "example" },
        { id: "sample-3", client: "Lucas Pérez", phone: "", date, time: "16:00", serviceId: "corte-clasico", serviceName: "Corte clásico", duration: 45, status: "confirmed", notes: "", source: "example" },
        { id: "sample-4", client: "Nicolás Díaz", phone: "", date: nextOpenDay(addDays(date, 1)), time: "11:00", serviceId: "estilo-personal", serviceName: "Estilo personal", duration: 60, status: "confirmed", notes: "", source: "example" },
      ],
    };
  };
  const isValid = (value) => value?.version === 1 && Array.isArray(value.services) && value.services.length > 0 && Array.isArray(value.appointments)
    && value.services.every((s) => s && typeof s.id === "string" && typeof s.name === "string" && typeof s.price === "string" && typeof s.description === "string" && [30, 45, 60, 90, 120].includes(s.duration))
    && value.appointments.every((a) => a && typeof a.id === "string" && typeof a.client === "string" && typeof a.phone === "string" && typeof a.notes === "string" && typeof a.serviceName === "string" && validDate(a.date) && allTimes.includes(a.time) && [30, 45, 60, 90, 120].includes(a.duration) && ["confirmed", "completed", "cancelled"].includes(a.status));
  let data = seed();
  const read = () => {
    if (!persistent) return data;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (isValid(saved)) data = { ...saved, website: normalizeWebsite(saved.website) };
      }
    } catch { persistent = false; }
    return data;
  };
  const persist = () => {
    try { localStorage.setItem(key, JSON.stringify(data)); persistent = true; }
    catch { persistent = false; }
    listeners.forEach((listener) => listener());
  };
  read();
  persist();
  const available = (date, time, duration, appointments = read().appointments) => {
    if (!isOpenDay(date) || !allTimes.includes(time)) return false;
    const start = minutes(time), end = start + duration;
    if (!((start >= 540 && end <= 780) || (start >= 900 && end <= 1140))) return false;
    return !appointments.some((a) => a.date === date && a.status !== "cancelled" && start < minutes(a.time) + a.duration && end > minutes(a.time));
  };
  const get = () => clone(read());
  window.DylanDemo = {
    get, today, addDays, isOpenDay, nextOpenDay, allTimes,
    storageAvailable: () => persistent,
    isAvailable: (date, time, serviceId) => {
      const current = read();
      const service = current.services.find((s) => s.id === serviceId);
      return Boolean(service && available(date, time, service.duration, current.appointments));
    },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    createAppointment: (input) => {
      read();
      const service = data.services.find((s) => s.id === input.serviceId);
      const client = String(input.client || "").trim();
      if (!client || client.length > 80) throw new Error("Ingresá un nombre de hasta 80 caracteres.");
      if (!service) throw new Error("Elegí un servicio.");
      if (!validDate(input.date) || !isOpenDay(input.date)) throw new Error("Elegí un día de martes a sábado.");
      if (!available(input.date, input.time, service.duration)) throw new Error("Ese horario no está disponible para la duración elegida. Probá otro.");
      const appointment = {
        id: globalThis.crypto?.randomUUID?.() || `turno-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        client, phone: String(input.phone || "").trim().slice(0, 40), date: input.date, time: input.time,
        serviceId: service.id, serviceName: service.name, duration: service.duration,
        status: "confirmed", notes: String(input.notes || "").trim().slice(0, 300), source: input.source === "web" ? "web" : "manual",
      };
      data.appointments.push(appointment);
      persist();
      return clone(appointment);
    },
    setStatus: (id, status) => {
      read();
      const appointment = data.appointments.find((a) => a.id === id);
      if (!appointment || appointment.status !== "confirmed" || !["completed", "cancelled"].includes(status)) throw new Error("El turno ya cambió. Actualizá la agenda.");
      appointment.status = status;
      persist();
    },
    saveService: (input) => {
      read();
      const service = data.services.find((s) => s.id === input.id);
      if (!service) throw new Error("No se encontró el servicio.");
      const name = String(input.name || "").trim(), price = String(input.price || "").trim();
      const duration = Number(input.duration);
      if (!name || name.length > 80 || !price || price.length > 40 || ![30, 45, 60, 90, 120].includes(duration)) throw new Error("Completá nombre, precio y duración del servicio.");
      Object.assign(service, { name, price, duration, description: String(input.description || "").trim().slice(0, 200) });
      persist();
    },
    saveWebsite: (input) => {
      read();
      for (const [field, max] of Object.entries(websiteLimits)) {
        if (typeof input[field] !== "string" || input[field].length > max) throw new Error("Revisá la longitud de los textos antes de guardar.");
      }
      for (const field of ["heroTitle", "heroCopy", "imprintTitle", "imprintCopy", "name"]) if (!input[field].trim()) throw new Error("Completá los títulos, las descripciones y el nombre del estudio.");
      for (const field of ["heroImage", "profileImage"]) if (!safeImage(input[field])) throw new Error("Usá una imagen JPG, PNG o WebP de menor tamaño.");
      if (input.whatsapp.trim() && (!/^\+?[\d\s()-]+$/.test(input.whatsapp.trim()) || input.whatsapp.replace(/\D/g, "").length < 7 || input.whatsapp.replace(/\D/g, "").length > 15)) throw new Error("Ingresá un WhatsApp con código de país y entre 7 y 15 dígitos.");
      const instagram = input.instagram.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/$/, "");
      if (instagram && !/^[a-zA-Z0-9._]{1,30}$/.test(instagram)) throw new Error("Instagram debe ser @usuario o un enlace a instagram.com/usuario.");
      const website = normalizeWebsite(input);
      for (const field of Object.keys(websiteLimits)) website[field] = website[field].trim();
      website.instagram = instagram ? `@${instagram}` : "";
      const candidate = { ...data, website };
      try { localStorage.setItem(key, JSON.stringify(candidate)); }
      catch { throw new Error("El navegador no pudo guardar la página. Probá con imágenes más livianas o habilitá el almacenamiento."); }
      data = candidate;
      persistent = true;
      listeners.forEach((listener) => listener());
      return clone(website);
    },
    reset: () => { data = seed(); persist(); },
  };
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      if (event.newValue === null) data = seed();
      read();
      listeners.forEach((listener) => listener());
    }
  });
})();
