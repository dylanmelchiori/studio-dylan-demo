/* Perfil de cliente de demostración: nombre + WhatsApp, sin contraseña ni autenticación real.
 * Los datos y las preferencias viven únicamente en este navegador. Guardar una preferencia
 * de notificaciones no concede permisos ni crea una suscripción a WhatsApp o Web Push. */
(() => {
  "use strict";
  const key = "studio-dylan-customer-v1";
  const maxProfiles = 50;
  const maxAppointments = 100;
  const maxStorageLength = 1000000;
  const listeners = new Set();
  let persistent = true;
  const empty = () => ({ version: 1, activeProfileId: null, profiles: [] });
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 160 && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
  const normalizedPhone = (phone) => phone.replace(/\D/g, "");
  const cleanName = (value) => {
    const name = typeof value === "string" ? value.trim() : "";
    if (name.length < 2 || name.length > 80) throw new Error("Ingresá un nombre de entre 2 y 80 caracteres.");
    return name;
  };
  const cleanPhone = (value) => {
    const phone = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    const digits = normalizedPhone(phone);
    if (phone.length > 40 || !/^\+?[\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      throw new Error("Ingresá un WhatsApp con código de país y entre 7 y 15 dígitos.");
    }
    return phone;
  };
  const demo = () => {
    try { return window.DylanDemo?.get() || { services: [], appointments: [] }; }
    catch { return { services: [], appointments: [] }; }
  };
  const serviceExists = (id) => demo().services.some((service) => service.id === id);
  const cleanServiceId = (value) => {
    if (value === "") return "";
    if (!validId(value) || !serviceExists(value)) throw new Error("Elegí un servicio disponible.");
    return value;
  };
  const parse = (raw) => {
    if (typeof raw !== "string" || raw.length > maxStorageLength) return empty();
    try {
      const saved = JSON.parse(raw);
      if (!saved || saved.version !== 1 || !Array.isArray(saved.profiles) || saved.profiles.length > maxProfiles) return empty();
      const ids = new Set(), phones = new Set();
      const profiles = saved.profiles.map((profile) => {
        if (!profile || !validId(profile.id) || ids.has(profile.id)) throw new Error("Invalid profile");
        const name = cleanName(profile.name), phone = cleanPhone(profile.phone);
        if (phones.has(normalizedPhone(phone))) throw new Error("Duplicate phone");
        if (profile.preferredServiceId !== "" && !validId(profile.preferredServiceId)) throw new Error("Invalid service");
        if (!profile.notifications || typeof profile.notifications.browser !== "boolean" || typeof profile.notifications.whatsapp !== "boolean") throw new Error("Invalid preferences");
        if (!Array.isArray(profile.appointmentIds) || profile.appointmentIds.length > maxAppointments || !profile.appointmentIds.every(validId)) throw new Error("Invalid appointments");
        ids.add(profile.id);
        phones.add(normalizedPhone(phone));
        return {
          id: profile.id, name, phone, preferredServiceId: profile.preferredServiceId,
          notifications: { browser: profile.notifications.browser, whatsapp: profile.notifications.whatsapp },
          appointmentIds: [...new Set(profile.appointmentIds)],
        };
      });
      return { version: 1, activeProfileId: ids.has(saved.activeProfileId) ? saved.activeProfileId : null, profiles };
    } catch { return empty(); }
  };
  let data = empty();
  const read = () => {
    // Once a write fails, keep the newer in-memory session instead of reloading stale data.
    if (persistent) {
      try { data = parse(window.localStorage.getItem(key)); }
      catch { persistent = false; }
    }
    return data;
  };
  const active = () => data.profiles.find((profile) => profile.id === data.activeProfileId) || null;
  const snapshot = () => {
    const profile = active();
    if (!profile) return null;
    return {
      id: profile.id, name: profile.name, phone: profile.phone,
      preferredServiceId: profile.preferredServiceId && serviceExists(profile.preferredServiceId) ? profile.preferredServiceId : "",
      notifications: { ...profile.notifications },
    };
  };
  const notify = () => {
    const profile = snapshot();
    listeners.forEach((listener) => {
      // One view's listener must not prevent saving or updating the other views.
      try { listener(profile ? clone(profile) : null); } catch { /* Isolate subscriber errors. */ }
    });
  };
  const persist = () => {
    try { window.localStorage.setItem(key, JSON.stringify(data)); persistent = true; }
    catch { persistent = false; }
    notify();
  };
  const requireProfile = () => {
    read();
    const profile = active();
    if (!profile) throw new Error("Ingresá con tu nombre y WhatsApp para continuar.");
    return profile;
  };
  const createId = () => window.crypto?.randomUUID?.() || `cliente-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  read();
  window.DylanCustomer = {
    getProfile: () => { read(); return snapshot(); },
    signIn: (input = {}) => {
      const name = cleanName(input.name), phone = cleanPhone(input.phone);
      read();
      let profile = data.profiles.find((entry) => normalizedPhone(entry.phone) === normalizedPhone(phone));
      if (!profile) {
        if (data.profiles.length >= maxProfiles) throw new Error("Se alcanzó el límite de perfiles de esta demo en el navegador.");
        let id = createId();
        while (data.profiles.some((entry) => entry.id === id)) id = `${createId()}-${Math.random().toString(36).slice(2, 8)}`;
        profile = { id, name, phone, preferredServiceId: "", notifications: { browser: false, whatsapp: false }, appointmentIds: [] };
        data.profiles.push(profile);
      } else {
        Object.assign(profile, { name, phone });
      }
      data.activeProfileId = profile.id;
      persist();
      return snapshot();
    },
    signOut: () => { read(); data.activeProfileId = null; persist(); },
    updateProfile: (input = {}) => {
      const profile = requireProfile();
      const name = input.name === undefined ? profile.name : cleanName(input.name);
      const phone = input.phone === undefined ? profile.phone : cleanPhone(input.phone);
      const preferredServiceId = input.preferredServiceId === undefined
        ? (profile.preferredServiceId && serviceExists(profile.preferredServiceId) ? profile.preferredServiceId : "")
        : cleanServiceId(input.preferredServiceId);
      if (data.profiles.some((entry) => entry.id !== profile.id && normalizedPhone(entry.phone) === normalizedPhone(phone))) {
        throw new Error("Ese WhatsApp ya tiene un perfil en este navegador. Ingresá con ese número para recuperarlo.");
      }
      Object.assign(profile, { name, phone, preferredServiceId });
      persist();
      return snapshot();
    },
    rememberAppointment: (appointmentId) => {
      const profile = requireProfile();
      if (!validId(appointmentId)) throw new Error("No se encontró el turno.");
      const appointment = demo().appointments.find((entry) => entry.id === appointmentId);
      if (!appointment || (appointment.customerId && appointment.customerId !== profile.id)) throw new Error("No se encontró un turno de tu perfil.");
      if (profile.appointmentIds.includes(appointmentId)) return;
      // The shared appointment's customerId is authoritative. Keep only a bounded
      // list of recent explicit links for legacy appointments without that field.
      profile.appointmentIds = profile.appointmentIds.slice(-(maxAppointments - 1));
      profile.appointmentIds.push(appointmentId);
      persist();
    },
    getAppointments: () => {
      read();
      const profile = active();
      if (!profile) return [];
      const ids = new Set(profile.appointmentIds);
      return clone(demo().appointments.filter((appointment) => appointment.customerId
        ? appointment.customerId === profile.id : ids.has(appointment.id))
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)));
    },
    setNotifications: (input = {}) => {
      const profile = requireProfile();
      const notifications = { ...profile.notifications };
      for (const field of ["browser", "whatsapp"]) {
        if (input[field] !== undefined) {
          if (typeof input[field] !== "boolean") throw new Error("Revisá tus preferencias de notificaciones.");
          notifications[field] = input[field];
        }
      }
      profile.notifications = notifications;
      persist();
      return snapshot();
    },
    subscribe: (listener) => {
      if (typeof listener !== "function") throw new TypeError("El suscriptor debe ser una función.");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    storageAvailable: () => persistent,
  };
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    data = event.newValue === null ? empty() : parse(event.newValue);
    notify();
  });
  window.DylanDemo?.subscribe(notify);
})();
