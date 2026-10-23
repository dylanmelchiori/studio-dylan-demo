const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const dist = path.resolve(__dirname, "../dist");
const scripts = ["content.js", "demo-store.js", "customer-store.js"].map((name) => ({
  name,
  source: fs.readFileSync(path.join(dist, name), "utf8"),
}));

function browserStorage() {
  return { values: new Map(), pages: new Set(), blocked: false, quota: false };
}

// Each VM represents another page on the same origin, including storage events.
function loadPage(storage = browserStorage()) {
  const listeners = new Set();
  const dispatch = (event) => listeners.forEach((listener) => listener(event));
  const localStorage = {
    getItem(key) {
      if (storage.blocked) throw new Error("Storage blocked");
      return storage.values.get(key) ?? null;
    },
    setItem(key, value) {
      if (storage.blocked || storage.quota) throw new Error("Storage unavailable");
      const oldValue = storage.values.get(key) ?? null;
      storage.values.set(key, value);
      if (oldValue !== value) {
        for (const page of storage.pages) {
          if (page !== dispatch) page({ key, oldValue, newValue: value });
        }
      }
    },
  };
  const context = vm.createContext({
    localStorage,
    crypto: { randomUUID },
    addEventListener: (type, listener) => {
      if (type === "storage") listeners.add(listener);
    },
  });
  context.window = context;
  storage.pages.add(dispatch);
  for (const { name, source } of scripts) vm.runInContext(source, context, { filename: name });
  return { storage, demo: context.DylanDemo, customer: context.DylanCustomer };
}

function bookingDate(demo) {
  // Stay clear of the illustrative appointments seeded around the current day.
  return demo.nextOpenDay(demo.addDays(demo.today(), 14));
}

function book(page, options = {}) {
  const { demo, customer } = page;
  const serviceId = options.serviceId || demo.get().services[0].id;
  customer.updateProfile({ preferredServiceId: serviceId });
  const profile = customer.getProfile();
  const appointment = demo.createAppointment({
    client: profile.name,
    phone: profile.phone,
    customerId: profile.id,
    serviceId,
    date: options.date || bookingDate(demo),
    time: options.time || "09:00",
    source: "web",
  });
  customer.rememberAppointment(appointment.id);
  return appointment;
}

test("a signed-in customer's booking and preferences survive a page reload", () => {
  const page = loadPage();
  const profile = page.customer.signIn({ name: "Juan Pérez", phone: "+54 9 11 1234 5678" });
  const appointment = book(page);
  page.customer.setNotifications({ browser: true, whatsapp: true });

  const reloaded = loadPage(page.storage);
  assert.equal(reloaded.customer.getProfile().id, profile.id);
  assert.equal(reloaded.customer.getProfile().preferredServiceId, appointment.serviceId);
  assert.equal(reloaded.customer.getProfile().notifications.browser, true);
  assert.equal(reloaded.customer.getProfile().notifications.whatsapp, true);
  assert.deepEqual(Array.from(reloaded.customer.getAppointments(), (item) => item.id), [appointment.id]);
  assert.equal(reloaded.customer.getAppointments()[0].customerId, profile.id);
  assert.equal(reloaded.demo.isAvailable(appointment.date, appointment.time, appointment.serviceId), false);
});

test("profile and service edits preserve the booking's original customer and service details", () => {
  const page = loadPage();
  page.customer.signIn({ name: "Ana Ruiz", phone: "+54 9 11 2345 6789" });
  const service = page.demo.get().services[0];
  page.demo.saveService({ ...service, name: "Corte original", price: "$ 12.000", duration: 45 });
  const appointment = book(page, { serviceId: service.id });

  page.customer.updateProfile({ name: "Ana Gómez", phone: "+54 9 11 3456 7890" });
  page.demo.saveService({ ...service, name: "Corte actualizado", price: "$ 15.000", duration: 60 });

  const reloaded = loadPage(page.storage);
  const saved = reloaded.customer.getAppointments().find((item) => item.id === appointment.id);
  assert.equal(reloaded.customer.getProfile().name, "Ana Gómez");
  assert.equal(reloaded.demo.get().services.find((item) => item.id === service.id).duration, 60);
  assert.equal(saved.client, "Ana Ruiz");
  assert.equal(saved.phone, "+54 9 11 2345 6789");
  assert.equal(saved.serviceName, "Corte original");
  assert.equal(saved.servicePrice, "$ 12.000");
  assert.equal(saved.duration, 45);
});

test("separate demo profiles do not inherit or claim each other's bookings", () => {
  const page = loadPage();
  const first = page.customer.signIn({ name: "Lucas Díaz", phone: "+54 9 11 4567 8901" });
  const firstAppointment = book(page);
  page.customer.signOut();
  const second = page.customer.signIn({ name: "Lucas Díaz", phone: "+54 9 11 5678 9012" });
  assert.notEqual(second.id, first.id);
  assert.equal(page.customer.getAppointments().length, 0);
  assert.throws(() => page.customer.rememberAppointment(firstAppointment.id), /tu perfil/);
  const secondAppointment = book(page, { time: "11:00" });
  assert.deepEqual(Array.from(page.customer.getAppointments(), (item) => item.id), [secondAppointment.id]);

  page.customer.signOut();
  page.customer.signIn({ name: "Lucas Díaz", phone: "5491145678901" });
  assert.equal(page.customer.getProfile().id, first.id);
  assert.deepEqual(Array.from(page.customer.getAppointments(), (item) => item.id), [firstAppointment.id]);
});

test("an admin cancellation updates the customer's history and releases the slot", () => {
  const page = loadPage();
  page.customer.signIn({ name: "Mara López", phone: "+54 9 11 6789 0123" });
  const appointment = book(page);
  let observedStatus;
  const unsubscribe = page.customer.subscribe(() => {
    observedStatus = page.customer.getAppointments().find((item) => item.id === appointment.id)?.status;
  });
  const admin = loadPage(page.storage);
  admin.demo.setStatus(appointment.id, "cancelled");

  assert.equal(page.customer.getAppointments()[0].status, "cancelled");
  assert.equal(observedStatus, "cancelled");
  assert.equal(page.demo.isAvailable(appointment.date, appointment.time, appointment.serviceId), true);
  unsubscribe();
});

test("blocked storage keeps the profile and booking usable in the current page", () => {
  const storage = browserStorage();
  storage.blocked = true;
  const page = loadPage(storage);
  const profile = page.customer.signIn({ name: "Sol Torres", phone: "+54 9 11 7890 1234" });
  const appointment = book(page);

  assert.equal(page.demo.storageAvailable(), false);
  assert.equal(page.customer.storageAvailable(), false);
  assert.equal(page.customer.getProfile().id, profile.id);
  assert.deepEqual(Array.from(page.customer.getAppointments(), (item) => item.id), [appointment.id]);
  assert.equal(page.demo.isAvailable(appointment.date, appointment.time, appointment.serviceId), false);
});

test("a quota failure retains newer in-memory profile edits and bookings", () => {
  const page = loadPage();
  page.customer.signIn({ name: "Nico Vega", phone: "+54 9 11 8901 2345" });
  const original = book(page);
  page.storage.quota = true;
  page.customer.updateProfile({ name: "Nicolás Vega" });
  const newer = book(page, { time: "11:00" });

  assert.equal(page.customer.storageAvailable(), false);
  assert.equal(page.demo.storageAvailable(), false);
  assert.equal(page.customer.getProfile().name, "Nicolás Vega");
  assert.deepEqual(Array.from(page.customer.getAppointments(), (item) => item.id), [newer.id, original.id]);
  assert.equal(page.customer.getAppointments()[0].client, "Nicolás Vega");
  page.customer.signOut();
  assert.equal(page.customer.getProfile(), null);
});
