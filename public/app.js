const list = document.querySelector("#offer-list");
const form = document.querySelector("#offer-form");
const message = document.querySelector("#form-message");

const icons = {
  "Panadería": "🥖",
  "Repostería": "🥐",
  "Frutas y verduras": "🍊",
  "Comida preparada": "🥗",
  "Otros": "🍃"
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) throw new Error((data.errors || [data.error || "No se pudo completar la solicitud."]).join(" "));
  return data;
}

async function refresh() {
  const [{ offers }, { reservations }, summary] = await Promise.all([
    request("/api/offers"),
    request("/api/reservations"),
    request("/api/summary")
  ]);
  document.querySelector("#available-packs").textContent = summary.availablePacks;
  document.querySelector("#reserved-orders").textContent = summary.reservedOrders;
  document.querySelector("#rescued-packs").textContent = summary.rescuedPacks + summary.donationPacks;
  renderOffers(offers);
  renderReservations(reservations);
}

function renderReservations(reservations) {
  const reservationList = document.querySelector("#reservation-list");
  if (!reservations.length) {
    reservationList.innerHTML = '<div class="empty-state">No hay reservas pendientes de recogida.</div>';
    return;
  }
  reservationList.innerHTML = reservations.map((reservation) => `
    <article class="offer-card reservation-card">
      <div class="offer-art" aria-hidden="true">✓</div>
      <div><h3 class="offer-title">${escapeHtml(reservation.customerName)}</h3>
        <p class="offer-sub">${reservation.quantity} pack · Reserva ${escapeHtml(reservation.id)}</p>
        <p class="offer-window">Total: ${currency(reservation.totalPrice)}</p></div>
      <div class="offer-actions"><span class="stock-chip">Pendiente</span>
        <button class="small-button" data-pickup="${escapeHtml(reservation.id)}">Confirmar recogida</button></div>
    </article>`).join("");
  reservationList.querySelectorAll("[data-pickup]").forEach((button) => {
    button.addEventListener("click", () => confirmPickup(button.dataset.pickup));
  });
}

function renderOffers(offers) {
  if (!offers.length) {
    list.innerHTML = '<div class="empty-state">Por ahora no hay ofertas activas. Publica un excedente para empezar.</div>';
    return;
  }
  list.innerHTML = offers.map((offer) => `
    <article class="offer-card">
      <div class="offer-art ${offer.category === "Frutas y verduras" ? "fruit" : offer.category === "Repostería" ? "pastry" : ""}" aria-hidden="true">${icons[offer.category] || "🍃"}</div>
      <div>
        <h3 class="offer-title">${escapeHtml(offer.name)}</h3>
        <p class="offer-sub">${escapeHtml(offer.merchantName)} · ${escapeHtml(offer.category)}</p>
        <p class="offer-window">${escapeHtml(offer.pickupWindow)}</p>
        <div class="offer-prices"><strong>${currency(offer.rescuePrice)}</strong><del>${currency(offer.regularPrice)}</del></div>
      </div>
      <div class="offer-actions">
        <span class="stock-chip">${offer.quantityAvailable} disponibles</span>
        <button class="small-button" data-reserve="${escapeHtml(offer.id)}">Reservar 1 pack</button>
        <button class="donate-button" data-donate="${escapeHtml(offer.id)}">Derivar a donación</button>
      </div>
    </article>`).join("");

  list.querySelectorAll("[data-reserve]").forEach((button) => {
    button.addEventListener("click", () => reserve(button.dataset.reserve));
  });
  list.querySelectorAll("[data-donate]").forEach((button) => {
    button.addEventListener("click", () => donate(button.dataset.donate));
  });
}

async function reserve(offerId) {
  const customerName = window.prompt("Nombre para la reserva:", "Cliente de prueba");
  if (!customerName) return;
  try {
    const { reservation } = await request("/api/reservations", {
      method: "POST",
      body: JSON.stringify({ offerId, customerName, quantity: 1 })
    });
    showNotice(`Reserva ${reservation.id} creada por ${currency(reservation.totalPrice)}. Confirma la recogida desde el negocio.`);
    await refresh();
  } catch (error) { showNotice(error.message); }
}

async function donate(offerId) {
  const confirmed = window.confirm("¿Quieres derivar todo el excedente disponible a un aliado social? La integración con la fundación se confirma por fuera de este prototipo.");
  if (!confirmed) return;
  try {
    const { donation } = await request(`/api/offers/${encodeURIComponent(offerId)}/donate`, {
      method: "POST",
      body: JSON.stringify({ partnerName: "Banco de alimentos aliado" })
    });
    showNotice(`Excedente derivado. Registro ${donation.id}; la confirmación del aliado queda pendiente.`);
    await refresh();
  } catch (error) { showNotice(error.message); }
}

async function confirmPickup(reservationId) {
  try {
    await request(`/api/reservations/${encodeURIComponent(reservationId)}/pickup`, { method: "PATCH" });
    showNotice("Recogida confirmada. El pack ya figura como rescatado.");
    await refresh();
  } catch (error) { showNotice(error.message); }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form).entries());
  values.merchantName = "Panadería La Esquina";
  values.quantityAvailable = Number(values.quantityAvailable);
  values.regularPrice = Number(values.regularPrice);
  values.rescuePrice = Number(values.rescuePrice);
  try {
    await request("/api/offers", { method: "POST", body: JSON.stringify(values) });
    form.reset();
    message.textContent = "Oferta publicada. Ya aparece en la vitrina.";
    await refresh();
  } catch (error) { message.textContent = error.message; }
});

document.querySelector("#donation-help").addEventListener("click", () => {
  document.querySelector("#ofertas").scrollIntoView({ behavior: "smooth" });
  showNotice("En una oferta activa, elige «Derivar a donación». El registro no confirma la recepción de una fundación.");
});

function currency(value) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function showNotice(text) {
  document.querySelector(".notice")?.remove();
  const notice = document.createElement("div");
  notice.className = "notice";
  notice.setAttribute("role", "status");
  notice.textContent = text;
  document.body.append(notice);
  window.setTimeout(() => notice.remove(), 6500);
}

refresh().catch((error) => {
  list.innerHTML = `<div class="empty-state">No se pudo cargar la vitrina: ${escapeHtml(error.message)}</div>`;
});
