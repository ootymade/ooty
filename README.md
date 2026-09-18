# Ooty Inventory

A mobile-first inventory management PWA for a small (~5 person, ~50 product)
business. Runs entirely in the browser — no backend, no app store install.

## Stack

- **React + Vite**, Tailwind CSS (mobile-first, large tap targets)
- **IndexedDB** via [Dexie.js](https://dexie.org/), wrapped behind a single
  data-access module (`src/db/storage.js`) so a real backend could later
  replace it without touching any screen
- **PWA**: manifest + service worker (via `vite-plugin-pwa`) for offline use
  and "Add to Home Screen"
- **Scanning**: [html5-qrcode](https://github.com/mebjas/html5-qrcode) for
  camera barcode/QR scanning, [qrcode.react](https://github.com/zpao/qrcode.react)
  to generate/print per-product QR labels

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # serve the production build locally
```

Open the dev/preview URL on your phone (same Wi-Fi) to test on a real device,
or use Chrome DevTools' device toolbar for a quick mobile preview.

## How data & sync work

Everything lives in the browser's IndexedDB — nothing leaves the phone on its
own. To share inventory state across the team's phones:

1. **Export** (Dashboard → *Export / Import data*) downloads a JSON snapshot
   of all products, suppliers, purchase orders and stock movements.
2. **Import** on another phone merges that file in — it never overwrites.
   - Products are matched by **SKU** (not the random local id), since two
     phones may create "the same" product offline.
   - Stock movements are merged as a set (deduped by id), and every
     product's quantity is then **recomputed from the merged movement log**.
     This makes stock counts correct regardless of merge order and safe to
     import the same file twice.
   - Suppliers and purchase orders are merged by id, newest `updatedAt` wins
     on a conflict.

There's no login — each phone picks a name/role once on first launch, which
is just used to label stock movements ("who did this").

## Project layout

```
src/
  db/
    db.js        Dexie schema (IndexedDB)
    storage.js   All data access — the only file screens talk to
  context/       Team-member (current user) + toast notification providers
  components/    Shared UI primitives + icons + bottom nav
  screens/       One folder per feature area (products, stock, scan, po, suppliers, settings)
```
