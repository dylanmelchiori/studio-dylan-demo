/* Editor de contenido de demostración. Los borradores se aplican al guardar. */
(() => {
  "use strict";

  const panel = document.querySelector("#panel-servicios");
  const store = window.DylanDemo;
  if (!panel || !store) return;

  const imprint = typeof publicContent !== "undefined" ? publicContent.imprint : {};
  const defaults = {
    heroTitle: "Tu corte.\nTu momento.",
    heroCopy: "Elegí un día, encontrá tu horario y reservá en menos de un minuto.",
    imprintTitle: imprint.title || "Cortes prolijos, trato cercano y tiempo para cada detalle.",
    imprintCopy: imprint.copy || "Dylan combina técnica, escucha y un ambiente relajado para que cada corte tenga intención y se sienta propio.",
    name: imprint.name || "Dylan Estilista",
    quote: imprint.quote || "Buen corte, buena charla, cero apuro.",
    detail: imprint.detail || "Atención personalizada, terminaciones cuidadas y recomendaciones simples para mantener el estilo.",
    address: "Dirección y barrio a confirmar", whatsapp: "", instagram: "",
    heroImage: "", heroImageAlt: "Interior de Studio Dylan",
    profileImage: "assets/dylan-profile.png", profileImageAlt: "Dylan, estilista en Studio Dylan",
  };
  const fields = [
    { key: "heroTitle", label: "Título principal", max: 120, rows: 2, required: true, hint: "Podés usar dos líneas para darle ritmo al título." },
    { key: "heroCopy", label: "Texto de presentación", max: 300, rows: 3, required: true },
    { key: "imprintTitle", label: "Título de la sección", max: 180, rows: 2, required: true },
    { key: "imprintCopy", label: "Presentación de Dylan", max: 600, rows: 4, required: true },
    { key: "name", label: "Nombre que se muestra", max: 80, required: true },
    { key: "quote", label: "Frase del estudio", max: 180, rows: 2 },
    { key: "detail", label: "Forma de trabajar", max: 300, rows: 3 },
    { key: "address", label: "Dirección o zona", max: 180, placeholder: "Ej. Av. San Martín 123 · Buenos Aires" },
    { key: "whatsapp", label: "WhatsApp", max: 40, type: "tel", placeholder: "Ej. +54 9 11 2345 6789", hint: "Con código de país y de área." },
    { key: "instagram", label: "Instagram", max: 80, placeholder: "Ej. @studio.dylan", hint: "Escribí el usuario o el enlace de tu perfil." },
  ];
  let saved;
  let draft;
  let initialized = false;
  let dirty = false;
  let loadingImages = 0;
  let imageEpoch = 0;
  const imageJobs = new Map();

  const catalogue = document.createElement("div");
  catalogue.id = "catalogue-content";
  while (panel.firstChild) catalogue.append(panel.firstChild);
  const tabs = document.createElement("div");
  tabs.className = "studio-tabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Servicios y contenido del sitio");
  tabs.innerHTML = '<button id="catalogue-tab" type="button" role="tab" aria-selected="true" aria-controls="catalogue-content" tabindex="0">Servicios <span>Tu catálogo</span></button><button id="website-tab" type="button" role="tab" aria-selected="false" aria-controls="website-content" tabindex="-1">Página web <span>Textos e imágenes</span></button>';
  catalogue.setAttribute("role", "tabpanel");
  catalogue.setAttribute("aria-labelledby", "catalogue-tab");
  const editor = document.createElement("div");
  editor.id = "website-content";
  editor.className = "website-editor";
  editor.setAttribute("role", "tabpanel");
  editor.setAttribute("aria-labelledby", "website-tab");
  editor.hidden = true;
  panel.append(tabs, catalogue, editor);

  const fieldMarkup = (key) => {
    const item = fields.find((field) => field.key === key);
    const attrs = `id="website-${key}" name="${key}" maxlength="${item.max}" ${item.required ? "required" : ""}${item.hint ? ` aria-describedby="website-${key}-hint"` : ""}`;
    return `<label class="website-field" for="website-${key}"><span>${item.label}${item.required ? "" : '<small>Opcional</small>'}</span>${item.rows ? `<textarea ${attrs} rows="${item.rows}"></textarea>` : `<input ${attrs} type="${item.type || "text"}"${item.placeholder ? ` placeholder="${item.placeholder}"` : ""} />`}${item.hint ? `<small id="website-${key}-hint">${item.hint}</small>` : ""}</label>`;
  };
  const imageMarkup = (key, title, description) => `<article class="website-image-card"><div class="website-image-media"><img id="website-${key}-thumb"${defaults[key] ? ` src="${defaults[key]}"` : " hidden"} alt="" loading="lazy" /><div class="website-image-empty" id="website-${key}-empty"${defaults[key] ? " hidden" : ""}><img src="assets/dylan-mark-hd.png" alt="" /><strong>Fondo de marca</strong><span>Sin foto en la portada</span></div></div><div class="website-image-copy"><h4>${title}</h4><p>${description}</p><div class="website-image-actions"><label class="button button-secondary" for="website-${key}-upload"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/></svg>Cambiar imagen</label><input class="website-file-input" id="website-${key}-upload" type="file" accept="image/jpeg,image/png,image/webp" data-image="${key}" /><button type="button" class="website-restore" data-restore="${key}">Restaurar original</button></div><label class="website-field website-alt-field" for="website-${key}Alt"><span>Descripción de la imagen</span><input id="website-${key}Alt" name="${key}Alt" maxlength="160" type="text" /></label><p class="website-image-status" id="website-${key}-status" role="status" aria-live="polite"></p></div></article>`;

  editor.innerHTML = `
    <div class="website-heading"><div><p class="eyebrow">TU ESTUDIO, A TU MANERA</p><h2>Una página con tu impronta.</h2><p>Probá los textos y las fotos que verá quien visite tu estudio.</p></div><a class="button button-secondary" href="index.html" target="_blank" rel="noopener">Abrir vista guardada <span aria-hidden="true">↗</span></a></div>
    <div class="website-overview" aria-label="Opciones de contenido"><article><span class="website-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 13h5m-5 3h8"/></svg></span><div><strong>Textos del estudio</strong><p>Portada, presentación y contacto</p></div></article><article><span class="website-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-5 4 4 3-3 5 5"/></svg></span><div><strong>2 imágenes</strong><p>Fondo de portada y foto de Dylan</p></div></article><article><span class="website-overview-icon website-overview-icon-copper" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></svg></span><div><strong>PC + celular</strong><p>Tu contenido se adapta a cada pantalla</p></div></article></div>
    <div class="website-workspace">
      <form id="website-form" class="website-form">
        <details class="website-group" open><summary><span class="website-group-number">01</span><span><strong>Portada</strong><small>La primera impresión de tu estudio</small></span><span class="website-chevron" aria-hidden="true">⌄</span></summary><div class="website-group-body">${fieldMarkup("heroTitle")}${fieldMarkup("heroCopy")}</div></details>
        <details class="website-group"><summary><span class="website-group-number">02</span><span><strong>Sobre Dylan</strong><small>Tu historia, tu estilo y tu forma de trabajar</small></span><span class="website-chevron" aria-hidden="true">⌄</span></summary><div class="website-group-body">${["imprintTitle", "imprintCopy", "name", "quote", "detail"].map(fieldMarkup).join("")}</div></details>
        <details class="website-group"><summary><span class="website-group-number">03</span><span><strong>Imágenes</strong><small>Elegí las fotos que representan al estudio</small></span><span class="website-chevron" aria-hidden="true">⌄</span></summary><div class="website-group-body website-images"><p class="website-format-note">JPG, PNG o WebP de hasta 8 MB. Las fotos se optimizan al cargarlas para esta prueba.</p>${imageMarkup("heroImage", "Fondo de portada", "Una foto del local o de tu trabajo.")}${imageMarkup("profileImage", "Foto de Dylan", "Una imagen cercana para tu presentación.")}</div></details>
        <details class="website-group"><summary><span class="website-group-number">04</span><span><strong>Contacto</strong><small>Cómo encontrarte y seguir tu trabajo</small></span><span class="website-chevron" aria-hidden="true">⌄</span></summary><div class="website-group-body">${["address", "whatsapp", "instagram"].map(fieldMarkup).join("")}</div></details>
        <div class="website-savebar"><div><span id="website-save-state" class="website-save-state" role="status" aria-live="polite">Vista guardada</span><p>Solo cambia la prueba en este navegador. No publica cambios para todos.</p></div><div class="website-save-actions"><button id="website-discard" class="button button-secondary" type="button" disabled>Descartar</button><button id="website-save" class="button button-primary" type="submit" disabled>Guardar vista de prueba</button></div><p id="website-error" class="website-message website-message-error" role="alert" hidden></p></div>
      </form>
      <aside class="website-preview-column" aria-label="Vista previa del contenido"><div class="website-preview-heading"><div><p class="eyebrow">MIENTRAS EDITÁS</p><h3>Así se va a ver</h3></div><span class="website-preview-live"><span aria-hidden="true"></span>Vista previa</span></div><div class="website-preview"><div class="website-preview-browser" aria-hidden="true"><span></span><span></span><span></span><small>Studio Dylan</small></div><div class="website-preview-nav"><img src="assets/dylan-mark-hd.png" alt="" /><strong>Studio Dylan</strong><span aria-hidden="true">☰</span></div><div class="website-preview-hero"><img id="website-preview-heroImage" src="assets/hero-salon.png" alt="" /><div><span>STUDIO DYLAN · ESTILISTA</span><h3 id="website-preview-heroTitle"></h3><p id="website-preview-heroCopy"></p><span class="website-preview-cta">Reservar mi turno <span aria-hidden="true">↗</span></span></div></div><div class="website-preview-about"><span class="website-preview-label">CONOCÉ EL ESTUDIO</span><h4 id="website-preview-imprintTitle"></h4><p id="website-preview-imprintCopy"></p><div class="website-preview-profile"><img id="website-preview-profileImage" src="assets/dylan-profile.png" alt="" /><div><strong id="website-preview-name"></strong><q id="website-preview-quote"></q></div></div><p id="website-preview-detail" class="website-preview-detail"></p></div><div class="website-preview-contact"><strong>Nos vemos en el estudio.</strong><p id="website-preview-address"></p><div><span id="website-preview-whatsapp"></span><span id="website-preview-instagram"></span></div></div><div class="website-preview-footer">STUDIO DYLAN <span>Hecho a tu medida.</span></div></div><p class="website-preview-note">Es una referencia del contenido. Abrí la vista guardada para recorrer la página completa.</p><div class="website-preview-tip"><span aria-hidden="true">✦</span><p>Una buena foto y unas pocas palabras propias cuentan mucho de tu estudio.</p></div></aside>
    </div>`;

  const form = editor.querySelector("#website-form");
  const saveButton = editor.querySelector("#website-save");
  const discardButton = editor.querySelector("#website-discard");
  const stateLabel = editor.querySelector("#website-save-state");
  const errorBox = editor.querySelector("#website-error");
  const normalize = (website) => Object.fromEntries(Object.keys(defaults).map((key) => [key, typeof website?.[key] === "string" ? website[key] : defaults[key]]));
  const imageUrl = (value, fallback) => typeof value === "string" && (value === defaults.heroImage || value === defaults.profileImage || /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 1800000) ? value : fallback;
  const showError = (message = "") => { errorBox.textContent = message; errorBox.hidden = !message; };
  const setImage = (element, source) => {
    element.hidden = !source;
    if (!source) element.removeAttribute("src");
    else if (element.getAttribute("src") !== source) element.src = source;
  };
  const updatePreview = () => {
    ["heroTitle", "heroCopy", "imprintTitle", "imprintCopy", "name", "quote", "detail"].forEach((key) => {
      const element = editor.querySelector(`#website-preview-${key}`);
      element.textContent = draft[key] || (key === "quote" ? "Tu frase, tu estilo." : "Tu texto aparecerá acá.");
    });
    ["heroImage", "profileImage"].forEach((key) => {
      const source = imageUrl(draft[key], defaults[key]);
      const preview = editor.querySelector(`#website-preview-${key}`);
      preview.alt = draft[`${key}Alt`];
      setImage(preview, source);
      setImage(editor.querySelector(`#website-${key}-thumb`), source);
      editor.querySelector(`#website-${key}-empty`).hidden = Boolean(source);
    });
    editor.querySelector("#website-preview-address").textContent = draft.address || "Tu dirección o zona";
    editor.querySelector("#website-preview-whatsapp").textContent = draft.whatsapp ? `WhatsApp · ${draft.whatsapp}` : "WhatsApp del estudio";
    editor.querySelector("#website-preview-instagram").textContent = draft.instagram || "@tu.estudio";
  };
  const updateState = (message) => {
    dirty = JSON.stringify(draft) !== JSON.stringify(saved);
    stateLabel.textContent = message || (dirty ? "Cambios sin guardar" : "Vista guardada en este navegador");
    stateLabel.classList.toggle("is-dirty", dirty);
    saveButton.disabled = !dirty || loadingImages > 0;
    discardButton.disabled = !dirty && loadingImages === 0;
  };
  const fill = () => {
    Object.keys(defaults).forEach((key) => { const input = form.elements.namedItem(key); if (input) input.value = draft[key]; });
    updatePreview();
    updateState();
  };
  const render = (data) => {
    if (initialized && (dirty || loadingImages > 0)) return;
    saved = normalize((data || store.get()).website);
    draft = { ...saved };
    initialized = true;
    fill();
  };
  const resetDraft = () => {
    imageEpoch += 1;
    loadingImages = 0;
    imageJobs.clear();
    dirty = false;
    editor.querySelectorAll(".website-image-status").forEach((element) => { element.textContent = ""; element.classList.remove("is-error"); });
    editor.querySelectorAll("input[type=file]").forEach((input) => { input.value = ""; });
    showError();
    render(store.get());
  };
  window.DylanEditor = { render, resetDraft };

  const selectTab = (selected, focus = false) => {
    tabs.querySelectorAll("[role=tab]").forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
    });
    if (focus) selected.focus();
  };
  tabs.addEventListener("click", (event) => { const tab = event.target.closest("[role=tab]"); if (tab) selectTab(tab); });
  tabs.addEventListener("keydown", (event) => {
    const options = [...tabs.querySelectorAll("[role=tab]")];
    const index = options.indexOf(event.target);
    if (index < 0 || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    selectTab(options[event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length], true);
  });
  form.addEventListener("input", (event) => {
    const { name, value } = event.target;
    if (!Object.hasOwn(defaults, name)) return;
    draft[name] = value;
    showError();
    updatePreview();
    updateState();
  });
  discardButton.addEventListener("click", () => { resetDraft(); updateState("Borrador descartado"); });
  form.addEventListener("invalid", (event) => { const group = event.target.closest("details"); if (group) group.open = true; }, true);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (loadingImages > 0) { showError("Esperá a que termine de cargar la imagen."); return; }
    if (!form.reportValidity()) return;
    try {
      store.saveWebsite({ ...draft });
      if (!store.storageAvailable()) throw new Error("El navegador no pudo guardar la vista. Tu borrador sigue acá; probá con fotos más livianas o permití el almacenamiento del sitio.");
      dirty = false;
      render(store.get());
      showError();
      editor.querySelectorAll(".website-image-status").forEach((element) => {
        if (element.textContent) element.textContent = "Imagen guardada en esta vista de prueba.";
        element.classList.remove("is-error");
      });
      updateState("Cambios guardados. Ya podés abrir la vista de prueba.");
    } catch (error) {
      showError(error.message || "No se pudo guardar. Tu borrador sigue disponible para volver a intentar.");
      updateState("No se pudo guardar el borrador");
    }
  });

  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la foto. Probá con otro archivo."));
    reader.onabort = () => reject(new Error("La carga se interrumpió. Volvé a elegir la foto."));
    reader.readAsDataURL(file);
  });
  const optimizePhoto = async (file) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Elegí una foto JPG, PNG o WebP. En iPhone podés exportarla como JPG.");
    if (!file.size || file.size > 8 * 1024 * 1024) throw new Error("La foto debe pesar hasta 8 MB. Elegí una versión más liviana.");
    const source = await readFile(file);
    const photo = await new Promise((resolve, reject) => {
      const value = new Image();
      value.onload = () => resolve(value);
      value.onerror = () => reject(new Error("No se pudo abrir esta imagen. Probá con otra foto JPG, PNG o WebP."));
      value.src = source;
    });
    if (!photo.naturalWidth || !photo.naturalHeight) throw new Error("La imagen no tiene un tamaño válido.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(photo.naturalWidth, photo.naturalHeight));
    canvas.width = Math.max(1, Math.round(photo.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(photo.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la foto. Intentá con una imagen más pequeña.");
    context.fillStyle = "#faf7f1";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/jpeg", 0.84);
    for (const quality of [0.72, 0.60, 0.48]) { if (result.length <= 410000) break; result = canvas.toDataURL("image/jpeg", quality); }
    if (result.length > 410000) {
      const small = document.createElement("canvas");
      small.width = Math.max(1, Math.round(canvas.width * 0.7));
      small.height = Math.max(1, Math.round(canvas.height * 0.7));
      const smallContext = small.getContext("2d");
      if (!smallContext) throw new Error("No se pudo optimizar la imagen.");
      smallContext.drawImage(canvas, 0, 0, small.width, small.height);
      result = small.toDataURL("image/jpeg", 0.65);
    }
    if (result.length > 600000 || !result.startsWith("data:image/jpeg;base64,")) throw new Error("No se pudo reducir esta foto lo suficiente. Probá con una imagen más pequeña.");
    return result;
  };
  editor.addEventListener("change", async (event) => {
    const input = event.target;
    const key = input.dataset.image;
    const file = input.files?.[0];
    if (!key || !file) return;
    const epoch = imageEpoch;
    const job = Symbol();
    imageJobs.set(key, job);
    loadingImages += 1;
    const status = editor.querySelector(`#website-${key}-status`);
    status.classList.remove("is-error");
    status.textContent = "Preparando tu foto…";
    updateState();
    try {
      const result = await optimizePhoto(file);
      if (epoch !== imageEpoch || imageJobs.get(key) !== job) return;
      draft[key] = result;
      status.textContent = "Foto lista. Guardá la vista para aplicar el cambio.";
      updatePreview();
      showError();
    } catch (error) {
      if (epoch !== imageEpoch || imageJobs.get(key) !== job) return;
      status.textContent = error.message || "No se pudo cargar la imagen.";
      status.classList.add("is-error");
    } finally {
      if (epoch === imageEpoch) {
        loadingImages = Math.max(0, loadingImages - 1);
        if (imageJobs.get(key) === job) input.value = "";
        updateState();
      }
    }
  });
  editor.addEventListener("click", (event) => {
    const button = event.target.closest("[data-restore]");
    if (!button) return;
    const key = button.dataset.restore;
    imageJobs.delete(key);
    draft[key] = defaults[key];
    draft[`${key}Alt`] = defaults[`${key}Alt`];
    const status = editor.querySelector(`#website-${key}-status`);
    status.classList.remove("is-error");
    status.textContent = "Imagen original seleccionada. Guardá para aplicar.";
    fill();
    showError();
  });
  render(store.get());
})();
