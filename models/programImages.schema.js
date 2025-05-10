const mongoose = require('mongoose')

const imageSchema = new mongoose.Schema({
  image_id: { type: Number, required: true, unique: true, min: 1000, max: 9999 },
  image_url: { type: String, required: true },
  program_fields: { type: String, required: true },
  added_by: { type: String, required: true }
}, { timestamps: true })

const Image = mongoose.model('Image', imageSchema)

module.exports = Image
