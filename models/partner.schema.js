const mongoose = require('mongoose')

const partnerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true},
  name: { type: String, required: true },
  description: { type: String, required: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'] },
  person_image: { type: String, required: true },
  company_logo: { type: String, required: true }
}, { timestamps: true })


const Partner = mongoose.model('Partner', partnerSchema)

module.exports = Partner
