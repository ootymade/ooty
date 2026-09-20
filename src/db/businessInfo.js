// Fixed business details for invoice PDFs. GSTIN/address are placeholders —
// replace with the real registered values before sending any invoice to a
// customer; an incorrect GSTIN or address on a GST invoice is a compliance
// problem, not just a cosmetic one.
export const BUSINESS = {
  name: 'OOTYMADE ONLINE PRIVATE LIMITED',
  gstin: 'PLACEHOLDER-GSTIN — set the real one in src/db/businessInfo.js',
  address: 'PLACEHOLDER ADDRESS — set the real registered office address in src/db/businessInfo.js',
  state: 'Tamil Nadu',
}

// Default GST rate applied to new order line items — editable per item
// before confirming. Verify actual applicable rates per product/HSN with
// your CA; this default is a starting point, not a compliance guarantee.
export const DEFAULT_GST_RATE = 5

export const SALES_CHANNELS = [
  'Amazon (First account)',
  'Amazon (Second account)',
  'Flipkart 1',
  'Flipkart 2',
  'Mirchi',
  'Mystore',
  'Meesho',
  'Direct',
]
