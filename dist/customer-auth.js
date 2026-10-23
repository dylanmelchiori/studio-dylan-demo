/* Acceso visual de demostración, guardado únicamente en este navegador. */
(() => {
  "use strict";
  const customer = window.DylanCustomer;
  let dialog, onSuccess, editing = false;
  const ensureDialog = () => {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "customer-login";
    dialog.setAttribute("aria-labelledby", "customer-login-title");
    dialog.innerHTML = `<button class="customer-login-close" type="button" aria-label="Cerrar acceso">×</button>
      <img class="customer-login-mark" src="assets/dylan-mark-hd.png" alt="" />
      <p class="customer-eyebrow">TU MOMENTO EMPIEZA ACÁ</p>
      <h2 id="customer-login-title">Qué bueno verte.</h2>
      <p class="customer-login-intro">Entrá a tu espacio para reservar más fácil y tener tu próximo corte a mano.</p>
      <form class="customer-login-form">
        <label>Tu nombre<input name="name" autocomplete="name" placeholder="¿Cómo te llamás?" minlength="2" maxlength="80" required /></label>
        <label>Tu WhatsApp<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+54 9 11 5555 5555" maxlength="40" required /></label>
        <p class="customer-login-error" role="alert"></p>
        <button class="customer-primary" type="submit">Entrar a mi espacio <span aria-hidden="true">↗</span></button>
      </form>
      <p class="customer-login-note">Acceso de demostración · Usá datos ficticios.<br />Tus datos se recuerdan en este navegador. Todavía no se verifica tu identidad ni se envían códigos.</p>`;
    document.body.append(dialog);
    dialog.querySelector(".customer-login-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      try {
        const fields = { name: form.elements.name.value, phone: form.elements.phone.value };
        const profile = editing && customer.getProfile() ? customer.updateProfile(fields) : customer.signIn(fields);
        const callback = onSuccess;
        dialog.close();
        callback?.(profile);
      } catch (error) { dialog.querySelector(".customer-login-error").textContent = error.message; }
    });
    dialog.addEventListener("close", () => { onSuccess = null; document.body.classList.remove("customer-login-open"); });
    return dialog;
  };
  const openLogin = (options = {}) => {
    ensureDialog();
    onSuccess = options.onSuccess;
    editing = Boolean(options.edit);
    const profile = customer.getProfile();
    dialog.querySelector("[name=name]").value = profile?.name || "";
    dialog.querySelector("[name=phone]").value = profile?.phone || "";
    dialog.querySelector(".customer-login-error").textContent = "";
    dialog.querySelector("h2").textContent = editing ? "Tus datos, al día." : "Qué bueno verte.";
    dialog.querySelector(".customer-login-intro").textContent = editing ? "Actualizá tu perfil. Vamos a usar estos datos en tu próxima reserva." : "Entrá a tu espacio para reservar más fácil y tener tu próximo corte a mano.";
    dialog.querySelector("[type=submit]").textContent = editing ? "Guardar mis datos" : "Entrar a mi espacio ↗";
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("customer-login-open");
    dialog.querySelector("[name=name]").focus();
  };
  window.DylanCustomerUI = { openLogin };
})();
