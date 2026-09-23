// Formats a gram amount as "X kg" (1 decimal) or "X g" for anything under 1kg.
export function formatWeight(grams) {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`
  return `${grams} g`
}

// Total weight on hand for a pack-tracked product (quantity in Nos × pack size).
export function productWeightGrams(product) {
  if (!product.packSizeGrams) return null
  return product.quantity * product.packSizeGrams
}
