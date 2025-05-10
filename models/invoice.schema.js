const mongoose = require('mongoose')

const invoiceSchema = new mongoose.Schema({
  INC_ID: { type: String, required: true, unique: true},
  AMOUNT: { type: String, required: true },
  AMOUNT_IW: { type: String, required: true },
  ADVANCE_DEPOSITE: { type: String, required: true },
  REMAINING_AMOUNT: { type: String, required: true },
  MOBILE: { type: String, required: true },
  INVOICE_ID: { type: String, required: true, unique: true },
  INVOICE_DATE: { type: String, required: true },
  DUE_DATE: { type: String, required: true },
  COM_NAME: { type: String, required: true },
  GSTIN: { type: String, required: true },
  PHONE: { type: String, required: true },
  EMAIL: { type: String, required: true },
  BILLING_ADD: { type: String, required: true },
  INVOICE_URL: {type: String, required: true}
}, { timestamps: true });

module.exports = mongoose.model('InvoiceData', invoiceSchema)
