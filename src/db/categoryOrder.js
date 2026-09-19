// Display priority for product categories (lower index = shown first).
// Any category not listed here falls back to alphabetical order, after all
// listed categories.
export const CATEGORY_ORDER = [
  'Chocolate',
  'Varkey',
  'Molding Chocolate',
  'Tea',
  'Biscuit',
  'Essential Oils',
  'Packaging Boxes',
]

export function sortByCategoryOrder(categories) {
  return [...categories].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
}
