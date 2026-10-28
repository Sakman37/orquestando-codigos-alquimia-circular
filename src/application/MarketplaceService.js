import { randomUUID } from "node:crypto";
import { validateOfferInput } from "../domain/Offer.js";

export class MarketplaceService {
  constructor(store, eventBus) {
    this.store = store;
    this.eventBus = eventBus;
  }

  listOffers() {
    return this.store.read().offers.filter((offer) => offer.status === "available" && offer.quantityAvailable > 0);
  }

  listReservations() {
    return this.store.read().reservations.filter((item) => item.status === "reserved");
  }

  createOffer(input) {
    const { value, errors } = validateOfferInput(input);
    if (errors.length) return { errors };
    const offer = {
      id: `ofr-${randomUUID().slice(0, 8)}`,
      ...value,
      status: "available",
      createdAt: new Date().toISOString()
    };
    this.store.update((state) => state.offers.unshift(offer));
    this.#emit("offer.published", { offerId: offer.id, category: offer.category });
    return { offer };
  }

  reserveOffer(input) {
    const offerId = String(input.offerId ?? "").trim();
    const customerName = String(input.customerName ?? "").trim().slice(0, 80);
    const quantity = Number(input.quantity ?? 1);
    if (!customerName) return { errors: ["Escribe el nombre para la reserva."] };
    if (!Number.isInteger(quantity) || quantity < 1) return { errors: ["La cantidad debe ser un número entero positivo."] };

    const result = this.store.update((state) => {
      const offer = state.offers.find((item) => item.id === offerId);
      if (!offer || offer.status !== "available" || offer.quantityAvailable < quantity) {
        return { error: "La oferta ya no tiene esa cantidad disponible." };
      }
      offer.quantityAvailable -= quantity;
      if (offer.quantityAvailable === 0) offer.status = "reserved";
      const reservation = {
        id: `res-${randomUUID().slice(0, 8)}`,
        offerId,
        customerName,
        quantity,
        totalPrice: offer.rescuePrice * quantity,
        status: "reserved",
        createdAt: new Date().toISOString()
      };
      state.reservations.unshift(reservation);
      return { reservation, offer };
    });

    if (result.error) return { errors: [result.error] };
    this.#emit("reservation.created", { reservationId: result.reservation.id, offerId, quantity });
    return result;
  }

  confirmPickup(reservationId) {
    const result = this.store.update((state) => {
      const reservation = state.reservations.find((item) => item.id === reservationId);
      if (!reservation) return { error: "No se encontró la reserva." };
      if (reservation.status !== "reserved") return { error: "La reserva ya fue cerrada." };
      reservation.status = "picked_up";
      reservation.pickedUpAt = new Date().toISOString();
      return { reservation };
    });
    if (result.error) return { errors: [result.error] };
    this.#emit("reservation.picked_up", { reservationId });
    return result;
  }

  donateOffer(offerId, partnerName = "Banco de alimentos aliado") {
    const result = this.store.update((state) => {
      const offer = state.offers.find((item) => item.id === offerId);
      if (!offer || offer.status !== "available" || offer.quantityAvailable < 1) {
        return { error: "No hay excedente disponible para derivar." };
      }
      const donation = {
        id: `don-${randomUUID().slice(0, 8)}`,
        offerId,
        partnerName: String(partnerName).trim().slice(0, 80) || "Banco de alimentos aliado",
        quantity: offer.quantityAvailable,
        status: "pending_partner_confirmation",
        createdAt: new Date().toISOString()
      };
      offer.quantityAvailable = 0;
      offer.status = "donated";
      state.donations.unshift(donation);
      return { donation, offer };
    });
    if (result.error) return { errors: [result.error] };
    this.#emit("donation.created", { donationId: result.donation.id, offerId });
    return result;
  }

  summary() {
    const state = this.store.read();
    const reserved = state.reservations.filter((item) => item.status === "reserved").length;
    const pickedUp = state.reservations.filter((item) => item.status === "picked_up").length;
    const rescuedPacks = state.reservations
      .filter((item) => item.status === "picked_up")
      .reduce((sum, item) => sum + item.quantity, 0);
    const donations = state.donations.reduce((sum, item) => sum + item.quantity, 0);
    const availablePacks = state.offers
      .filter((offer) => offer.status === "available")
      .reduce((sum, offer) => sum + offer.quantityAvailable, 0);
    return { availablePacks, reservedOrders: reserved, completedOrders: pickedUp, rescuedPacks, donationPacks: donations };
  }

  #emit(type, data) {
    this.eventBus.publish({ id: randomUUID(), type, occurredAt: new Date().toISOString(), data });
  }
}
