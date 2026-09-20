// Fixed business details for invoice PDFs.
export const BUSINESS = {
  name: 'OOTYMADE ONLINE PRIVATE LIMITED',
  gstin: '33AAECO7384G1ZA',
  // Legal registered address — required on GST invoices.
  address:
    'D.NO 10/372, C-2, Periya Bikkatty Annai Indra Nagar, Aruvankadu Post, The Nilgiris, Tamil Nadu 643202',
  // Office / shipping address, shown as a secondary line if useful (e.g. for
  // "ships from" or contact purposes) — not the legal registered address.
  officeAddress:
    '421/H5, First Floor, Sri Srinivasaperumal Kalyana Mandapam, Ettines Road, Ooty, Tamil Nadu 643001',
  phones: ['978 978 4344', '97861 68888'],
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
