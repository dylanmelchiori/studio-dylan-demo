"use strict";
const state = publicContent;
const allTimes = ["09:00", "10:00", "11:00", "12:00", "13:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
let selectedDate = "", selectedTime = "", bookableDaysKey = "";
let scheduleLocked = false;
let occupiedSlots = [];
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
const result = document.querySelector("#demo-result");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"})[character]);
const pad = (value) => String(value).padStart(2, "0");
const formatDate = (isoDate, options = {weekday:"long", day:"numeric", month:"long"}) => {
  const value = new Date(isoDate + "T12:00:00").toLocaleDateString("es-AR", options);
  return value.charAt(0).toUpperCase() + value.slice(1);
};
const isOccupied = (date, time) => occupiedSlots.some((slot) => slot.date === date && slot.time === time);
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
        document.querySelector("#imprint-title").textContent = state.imprint.title;
        document.querySelector("#imprint-copy").textContent = state.imprint.copy;
        document.querySelector("#imprint-name").textContent = state.imprint.name;
        document.querySelector("#imprint-quote").textContent = `“${state.imprint.quote}”`;
        document.querySelector("#imprint-detail").textContent = state.imprint.detail;
        document.querySelector("#imprint-tags").innerHTML = (state.imprint.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");

        const photo = document.querySelector("#imprint-photo");
        if (state.imprint.photo && /^assets\//.test(state.imprint.photo)) {
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
          const occupied = new Set(occupiedSlots.filter((slot) => slot.date === date).map((slot) => slot.time)).size;
          const available = Math.max(0, allTimes.length - occupied);
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
              ${time}<small>${occupied ? "Ocupado" : "Disponible"}</small>
            </button>
          `;
        }).join("");
        document.querySelector("#morning-slots").innerHTML = renderGroup(allTimes.slice(0, 5));
        document.querySelector("#afternoon-slots").innerHTML = renderGroup(allTimes.slice(5));
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
serviceSelect.addEventListener("change", updateSelectedService);
bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedDate || !selectedTime || !bookingForm.reportValidity()) return;
  if (isOccupied(selectedDate, selectedTime)) return;
  const summary = `${getService(serviceSelect.value).name} · ${formatDate(selectedDate)} · ${selectedTime}`;
  occupiedSlots.push({date:selectedDate, time:selectedTime});
  result.querySelector("strong").textContent = "¡Prueba completada!";
  result.querySelector(".demo-summary").textContent = summary;
  result.hidden = false;
  selectedTime = "";
  bookingForm.reset();
  bookingPlaceholder.textContent = "Podés elegir otro horario para seguir probando.";
  renderBooking();
  result.scrollIntoView({behavior:"smooth", block:"center"});
});
document.querySelector("#reset-demo").addEventListener("click", () => {
  occupiedSlots = [];
  selectedDate = "";
  selectedTime = "";
  result.hidden = true;
  bookingForm.reset();
  renderBooking();
  bookingSection.scrollIntoView({behavior:"smooth", block:"start"});
});
if ("IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting);
    mobileCtaLink.textContent = visible && selectedTime ? "Completar prueba" : "Probar reserva";
    mobileCtaLink.href = visible && selectedTime ? "#booking-form" : "#turnos";
  }, {threshold:0.22}).observe(bookingSection);
}
renderImprint(); renderServices(); renderBooking();
