"use strict";
const demoStore = window.DylanDemo;
const customerStore = window.DylanCustomer;
const state = { ...publicContent, services: demoStore.get().services };
const allTimes = demoStore.allTimes;
let selectedDate = "", selectedTime = "", bookableDaysKey = "";
let scheduleLocked = false;
const menuButton = document.querySelector(".icon-button");
const mobileMenu = document.querySelector(".mobile-menu");
const siteHeader = document.querySelector(".site-header");
const bookingSection = document.querySelector("#turnos");
const bookingForm = document.querySelector("#booking-form");
const serviceSelect = document.querySelector("#service-select");
const selectedService = document.querySelector("#selected-service");
const selectedDay = document.querySelector("#selected-day");
const mobileSelectedDay = document.querySelector("#mobile-selected-day");
const selectionBar = document.querySelector("#selection-bar");
const slotPicker = document.querySelector("#slot-picker");
const bookingDetails = document.querySelector("#booking-details");
const bookingPlaceholder = document.querySelector("#booking-placeholder");
const mobileCtaLink = document.querySelector(".mobile-cta a");
const mobileCta = document.querySelector(".mobile-cta");
const headerBookingCta = document.querySelector(".header-actions .compact-cta");
const result = document.querySelector("#demo-result");
const bookingCalendarButton = document.querySelector("#booking-calendar");
let lastBookedAppointmentId = null;
let activeCustomerId = null;
const updateCalendarAction = () => {
  const appointment = demoStore.get().appointments.find((a) => a.id === lastBookedAppointmentId);
  bookingCalendarButton.disabled = !appointment || appointment.status === "cancelled";
  document.querySelector("#booking-calendar-message").textContent = appointment?.status === "cancelled" ? "Este turno de prueba fue cancelado en el panel." : "";
};
bookingCalendarButton.addEventListener("click", () => {
  const appointment = demoStore.get().appointments.find((a) => a.id === lastBookedAppointmentId);
  window.DylanCalendarPanel.openAppointment(appointment, "customer");
});
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"})[character]);
const pad = (value) => String(value).padStart(2, "0");
const formatDate = (isoDate, options = {weekday:"long", day:"numeric", month:"long"}) => {
  const value = new Date(isoDate + "T12:00:00").toLocaleDateString("es-AR", options);
  return value.charAt(0).toUpperCase() + value.slice(1);
};
const isOccupied = (date, time) => !demoStore.isAvailable(date, time, serviceSelect.value || state.services[0].id);
const getService = (id) => state.services.find((service) => service.id === id) || state.services[0];
      const getBuenosAiresClock = (now = new Date()) => {
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          weekday: "short",
          hour: "2-digit",
          hourCycle: "h23",
        }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
        return {
          date: `${parts.year}-${parts.month}-${parts.day}`,
          weekday: ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 })[parts.weekday],
          hour: Number(parts.hour),
        };
      };

      const addDaysToISO = (isoDate, amount) => {
        const date = new Date(`${isoDate}T12:00:00Z`);
        date.setUTCDate(date.getUTCDate() + amount);
        return date.toISOString().slice(0, 10);
      };


// The preview always offers the next five opening days, including on Sundays.
const getBookableDays = (now = new Date()) => {
  const days = [];
  let date = getBuenosAiresClock(now).date;
  while (days.length < 5) {
    const weekday = new Date(date + "T12:00:00Z").getUTCDay();
    if (weekday >= 2 && weekday <= 6) days.push(date);
    date = addDaysToISO(date, 1);
  }
  return days;
};
      const renderImprint = () => {
        const website = demoStore.get().website;
        state.imprint = { ...publicContent.imprint, title: website.imprintTitle, copy: website.imprintCopy, name: website.name, quote: website.quote, detail: website.detail, photo: website.profileImage };
        document.querySelector("#imprint-title").textContent = state.imprint.title;
        document.querySelector("#imprint-copy").textContent = state.imprint.copy;
        document.querySelector("#imprint-name").textContent = state.imprint.name;
        document.querySelector("#imprint-quote").textContent = `“${state.imprint.quote}”`;
        document.querySelector("#imprint-detail").textContent = state.imprint.detail;
        document.querySelector("#imprint-tags").innerHTML = (state.imprint.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");

        const photo = document.querySelector("#imprint-photo");
        photo.setAttribute("role", "img");
        photo.setAttribute("aria-label", website.profileImageAlt || "Studio Dylan");
        if (state.imprint.photo && /^(assets\/|data:image\/(jpeg|png|webp);base64,)/.test(state.imprint.photo)) {
          photo.style.backgroundImage = `linear-gradient(rgba(5, 12, 12, 0.18), rgba(5, 12, 12, 0.18)), url("${state.imprint.photo.replace(/"/g, "%22")}")`;
          photo.style.backgroundSize = "cover";
          photo.style.backgroundPosition = "center";
          photo.textContent = "";
        } else {
          photo.style.backgroundImage = 'url("assets/dylan-logo.jpg")';
          photo.style.backgroundSize = "cover";
          photo.style.backgroundPosition = "center";
          photo.textContent = "";
        }
      };

const renderWebsite = () => {
  const website = demoStore.get().website;
  document.querySelector(".hero h1").textContent = website.heroTitle;
  document.querySelector(".hero-copy").textContent = website.heroCopy;
  const heroImage = document.querySelector("#public-hero-image");
  heroImage.hidden = !website.heroImage;
  if (website.heroImage) heroImage.src = website.heroImage;
  else heroImage.removeAttribute("src");
  heroImage.alt = website.heroImageAlt;
  document.querySelector("#public-contact-name").textContent = website.name;
  document.querySelector("#public-contact-address").textContent = website.address;
  const whatsapp = document.querySelector("#public-whatsapp");
  const phone = website.whatsapp.replace(/\D/g, "");
  whatsapp.hidden = !phone;
  if (phone) whatsapp.href = `https://wa.me/${phone}`;
  else whatsapp.removeAttribute("href");
  const instagram = document.querySelector("#public-instagram");
  const handle = website.instagram.replace(/^@/, "");
  instagram.hidden = !/^[a-zA-Z0-9._]{1,30}$/.test(handle);
  if (!instagram.hidden) instagram.href = `https://www.instagram.com/${encodeURIComponent(handle)}/`;
  else instagram.removeAttribute("href");
  renderImprint();
};

      const renderServices = () => {
        const serviceGrid = document.querySelector("#public-services");
        serviceGrid.innerHTML = state.services.map((service, index) => `
          <article class="service-card">
            <span>${pad(index + 1)}</span>
            <h3>${escapeHtml(service.name)}</h3>
            <p>${escapeHtml(service.description)}</p>
            <div class="service-meta">
              <strong>${escapeHtml(service.price)}</strong>
              <span>${Number(service.duration) || 45} min</span>
            </div>
          </article>
        `).join("");

        const currentService = serviceSelect.value;
        serviceSelect.innerHTML = state.services.map((service) => `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name)}</option>`).join("");
        if (state.services.some((service) => service.id === currentService)) serviceSelect.value = currentService;
        updateSelectedService();
      };

      const updateSelectedService = () => {
        const service = getService(serviceSelect.value);
        selectedService.textContent = service?.name || "Servicio a definir";
      };

      const renderDays = () => {
        const dayTabs = document.querySelector("#day-tabs");
        const bookableDays = getBookableDays();
        bookableDaysKey = bookableDays.join("|");
        scheduleLocked = bookableDays.length === 0;

        if (scheduleLocked) {
          selectedDate = "";
          selectedTime = "";
          dayTabs.innerHTML = `
            <div class="schedule-closed">
              <strong>La próxima semana abre el domingo a las 22:00.</strong>
              <span>Los turnos se publican de martes a sábado.</span>
            </div>
          `;
          return;
        }

        if (selectedDate && !bookableDays.includes(selectedDate)) {
          selectedDate = "";
          selectedTime = "";
        }

        dayTabs.innerHTML = bookableDays.map((date) => {
          const available = allTimes.filter((time) => !isOccupied(date, time)).length;
          const active = selectedDate === date;
          return `
            <button class="day-tab${active ? " active" : ""}" type="button" data-date="${date}" aria-pressed="${active}">
              <strong>${escapeHtml(formatDate(date, { weekday: "short", day: "numeric" }))}</strong>
              <span>${available} ${available === 1 ? "horario" : "horarios"}</span>
            </button>
          `;
        }).join("");
      };

      const renderSlots = () => {
        slotPicker.hidden = scheduleLocked || !selectedDate;
        if (scheduleLocked || !selectedDate) return;
        const renderGroup = (times) => times.map((time) => {
          const occupied = isOccupied(selectedDate, time);
          const selected = selectedTime === time;
          return `
            <button class="slot${occupied ? " disabled" : ""}${selected ? " selected" : ""}" type="button" data-time="${time}" aria-pressed="${selected}" ${occupied ? "disabled" : ""}>
              ${time}<small>${occupied ? "No disponible" : "Disponible"}</small>
            </button>
          `;
        }).join("");
        document.querySelector("#morning-slots").innerHTML = renderGroup(allTimes.filter((time) => time < "13:00"));
        document.querySelector("#afternoon-slots").innerHTML = renderGroup(allTimes.filter((time) => time >= "15:00"));
      };

      const renderBookingSelection = () => {
        const ready = Boolean(selectedDate && selectedTime);
        bookingDetails.hidden = !ready;
        bookingPlaceholder.hidden = ready || scheduleLocked;
        selectionBar.hidden = !ready;
        if (!ready) return;
        const selectionText = `${formatDate(selectedDate)}, ${selectedTime}`;
        selectedDay.textContent = selectionText;
        mobileSelectedDay.textContent = selectionText;
        updateSelectedService();
      };


const renderBooking = () => { renderDays(); renderSlots(); renderBookingSelection(); };
const closeMenu = () => {
  mobileMenu.classList.remove("open");
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
};
// Keep persistent reservation shortcuts out of the way while reading down.
let previousScroll = Math.max(0, window.scrollY);
let scrollDirection = 0;
let scrollDistance = 0;
let scrollFrame = false;
const showBookingShortcuts = (show) => {
  [mobileCta, headerBookingCta].forEach((element) => {
    element.classList.toggle("booking-cta-hidden", !show);
    element.inert = !show;
  });
};
window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = true;
  requestAnimationFrame(() => {
    scrollFrame = false;
    const current = Math.max(0, window.scrollY);
    const delta = current - previousScroll;
    previousScroll = current;
    if (document.body.classList.contains("menu-open")) return;
    if (current <= 8) { showBookingShortcuts(true); scrollDistance = 0; return; }
    if (Math.abs(delta) < 1) return;
    const direction = Math.sign(delta);
    scrollDistance = direction === scrollDirection ? scrollDistance + Math.abs(delta) : Math.abs(delta);
    scrollDirection = direction;
    if (scrollDistance >= 10) showBookingShortcuts(direction < 0);
  });
}, { passive: true });
menuButton.addEventListener("click", () => {
  const open = !mobileMenu.classList.contains("open");
  mobileMenu.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
});
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
document.querySelector("#day-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button) return;
  selectedDate = button.dataset.date;
  selectedTime = "";
  bookingPlaceholder.textContent = "Ahora elegí uno de los horarios disponibles.";
  renderBooking();
});
document.querySelector(".booking-board").addEventListener("click", (event) => {
  const button = event.target.closest("[data-time]");
  if (!button || button.disabled) return;
  selectedTime = button.dataset.time;
  renderBooking();
  if (window.innerWidth < 740) bookingDetails.scrollIntoView({behavior:"smooth", block:"start"});
});
serviceSelect.addEventListener("change", () => {
  if (selectedDate && selectedTime && isOccupied(selectedDate, selectedTime)) selectedTime = "";
  updateSelectedService(); renderBooking();
});
bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const profile = customerStore.getProfile();
  if (!profile) { window.DylanCustomerUI.openLogin({ onSuccess: () => bookingSection.scrollIntoView({ behavior: "smooth", block: "start" }) }); return; }
  if (!selectedDate || !selectedTime || !bookingForm.reportValidity()) return;
  const summary = `${getService(serviceSelect.value).name} · ${formatDate(selectedDate)} · ${selectedTime}`;
  const bookedDate = selectedDate;
  try {
    customerStore.updateProfile({ preferredServiceId: serviceSelect.value });
    const appointment = demoStore.createAppointment({ client: profile.name, phone: profile.phone, customerId: profile.id, date: selectedDate, time: selectedTime, serviceId: serviceSelect.value, source: "web" });
    lastBookedAppointmentId = appointment.id;
    customerStore.rememberAppointment(appointment.id);
  } catch (error) {
    bookingForm.querySelector(".form-message").textContent = error.message;
    renderBooking();
    return;
  }
  bookingForm.querySelector(".form-message").textContent = "";
  result.querySelector("strong").textContent = "Tu próximo momento, listo.";
  result.querySelector(".demo-summary").textContent = summary;
  document.querySelector("#admin-result-link").href = `admin.html?date=${encodeURIComponent(bookedDate)}`;
  const customerLink = document.querySelector("#customer-result-link");
  customerLink.href = `customer.html?appointment=${encodeURIComponent(lastBookedAppointmentId)}`;
  const canNavigate = demoStore.storageAvailable() && customerStore.storageAvailable();
  customerLink.hidden = !canNavigate;
  document.querySelector("#customer-result-note").textContent = canNavigate ? "Tu turno de prueba quedó guardado en este navegador." : "El navegador no pudo guardar la prueba. Podés revisar este resumen y añadirlo al calendario mientras esta página siga abierta. Habilitá el almacenamiento para usar Mi espacio.";
  result.hidden = false;
  updateCalendarAction();
  selectedTime = "";
  bookingForm.reset();
  fillCustomerFields();
  bookingPlaceholder.textContent = "Podés elegir otro horario para seguir probando.";
  renderBooking();
  result.scrollIntoView({behavior:"smooth", block:"center"});
  if (canNavigate) window.location.assign(customerLink.href);
});
document.querySelector("#reset-demo").addEventListener("click", () => {
  lastBookedAppointmentId = null;
  selectedDate = "";
  selectedTime = "";
  result.hidden = true;
  bookingForm.reset();
  fillCustomerFields();
  bookingForm.querySelector(".form-message").textContent = "";
  renderBooking();
  bookingSection.scrollIntoView({behavior:"smooth", block:"start"});
});
if ("IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting);
    mobileCtaLink.textContent = visible && selectedTime ? "Revisar mi turno" : "Probar reserva";
    mobileCtaLink.href = visible && selectedTime ? "#booking-form" : "#turnos";
  }, {threshold:0.22}).observe(bookingSection);
}
const fillCustomerFields = () => {
  const profile = customerStore.getProfile();
  bookingForm.elements.nombre.value = profile?.name || "";
  bookingForm.elements.whatsapp.value = profile?.phone || "";
};
const renderCustomer = () => {
  const profile = customerStore.getProfile();
  if (activeCustomerId !== (profile?.id || null)) {
    const calendarDialog = document.querySelector("#dylan-calendar-dialog");
    if (calendarDialog?.open) calendarDialog.close();
    activeCustomerId = profile?.id || null;
    selectedDate = "";
    selectedTime = "";
    lastBookedAppointmentId = null;
    result.hidden = true;
    if (state.services.some((service) => service.id === profile?.preferredServiceId)) serviceSelect.value = profile.preferredServiceId;
    else serviceSelect.value = state.services[0].id;
    bookingPlaceholder.textContent = "Elegí un día y un horario para continuar.";
    bookingForm.querySelector(".form-message").textContent = "";
  }
  document.querySelector("#customer-booking-shell").hidden = !profile;
  document.querySelector("#customer-booking-login").hidden = Boolean(profile);
  document.querySelector("#customer-booking-logout").hidden = !profile;
  document.querySelector("#customer-space-link").hidden = !profile;
  document.querySelector("#customer-welcome").textContent = profile ? `Hola, ${profile.name.split(" ")[0]}. Todo listo para tu próximo corte.` : "Primero, nos conocemos.";
  document.querySelector("#customer-caption").textContent = profile ? "Tus datos ya están guardados. Elegí tu servicio, día y horario." : "Ingresá una vez. Tus datos estarán listos en cada reserva.";
  document.querySelector("#customer-avatar").textContent = profile ? profile.name.split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() : "01";
  document.querySelectorAll("[data-customer-access] span").forEach((node) => { node.textContent = profile ? "Mi espacio" : "Ingresar"; });
  fillCustomerFields();
  renderBooking();
};
const openBookingLogin = () => {
  closeMenu();
  window.DylanCustomerUI.openLogin({ onSuccess: () => {
    bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    serviceSelect.focus({ preventScroll: true });
  } });
};
document.querySelectorAll("[data-customer-access]").forEach((button) => button.addEventListener("click", () => {
  if (customerStore.getProfile()) openCustomerSpace();
  else openBookingLogin();
}));
document.querySelector("#customer-booking-login").addEventListener("click", openBookingLogin);
document.querySelector("#customer-booking-logout").addEventListener("click", () => { customerStore.signOut(); document.querySelector("#customer-booking-login").focus(); });
document.querySelector("#customer-edit-booking").addEventListener("click", () => window.DylanCustomerUI.openLogin({ edit: true }));
const canOpenCustomerSpace = () => demoStore.storageAvailable() && customerStore.storageAvailable();
const openCustomerSpace = (url = "customer.html") => {
  if (canOpenCustomerSpace()) { window.location.assign(url); return; }
  document.querySelector("#customer-storage-note").hidden = false;
  bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
};
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='customer.html']");
  if (!link || canOpenCustomerSpace()) return;
  event.preventDefault();
  closeMenu();
  openCustomerSpace();
});
const updateStorageNotice = () => {
  const available = canOpenCustomerSpace();
  document.querySelector("#public-storage-note").hidden = available;
  document.querySelector("#customer-storage-note").hidden = available;
};
renderWebsite(); renderServices(); renderCustomer(); updateStorageNotice();
customerStore.subscribe(() => { renderCustomer(); updateStorageNotice(); });
demoStore.subscribe(() => {
  updateStorageNotice();
  updateCalendarAction();
  window.DylanCalendarPanel.render(demoStore.get());
  renderWebsite();
  state.services = demoStore.get().services;
  renderServices();
  if (selectedDate && selectedTime && isOccupied(selectedDate, selectedTime)) selectedTime = "";
  renderBooking();
});
window.addEventListener("pageshow", () => {
  updateCalendarAction();
  window.DylanCalendarPanel.render(demoStore.get());
  renderWebsite();
  state.services = demoStore.get().services;
  renderServices(); renderBooking();
});
