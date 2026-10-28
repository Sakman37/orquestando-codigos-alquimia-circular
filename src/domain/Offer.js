const validCategories = new Set([
  "Panadería",
  "Repostería",
  "Frutas y verduras",
  "Comida preparada",
  "Otros"
]);

export function validateOfferInput(input) {
  const errors = [];
  const merchantName = cleanText(input.merchantName, 80);
  const name = cleanText(input.name, 80);
  const category = cleanText(input.category, 40);
  const description = cleanText(input.description, 220);
  const pickupWindow = cleanText(input.pickupWindow, 100);
  const quantityAvailable = Number(input.quantityAvailable);
  const regularPrice = Number(input.regularPrice);
  const rescuePrice = Number(input.rescuePrice);

  if (!merchantName) errors.push("Escribe el nombre del negocio.");
  if (!name) errors.push("Escribe el nombre del producto.");
  if (!validCategories.has(category)) errors.push("Selecciona una categoría válida.");
  if (!pickupWindow) errors.push("Especifica una ventana de recogida.");
  if (!Number.isInteger(quantityAvailable) || quantityAvailable < 1 || quantityAvailable > 500) {
    errors.push("La cantidad debe ser un número entero entre 1 y 500.");
  }
  if (!Number.isFinite(regularPrice) || regularPrice < 1) errors.push("El precio habitual debe ser mayor que cero.");
  if (!Number.isFinite(rescuePrice) || rescuePrice < 0 || rescuePrice >= regularPrice) {
    errors.push("El precio de rescate debe ser menor que el precio habitual.");
  }

  return {
    errors,
    value: { merchantName, name, category, description, pickupWindow, quantityAvailable, regularPrice, rescuePrice }
  };
}

function cleanText(value, maxLength) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, maxLength);
}
