const mongoose = require('mongoose')

const ngoEventSchema = new mongoose.Schema({
  event_id:{ type: String, required: true, unique: true},
  title: { type: String, required: true },
  purpose: { type: String, required: true },
  description: { type: String, required: true },
  image1: { type: String, required: true },
  image2: { type: String, required: true },
  image3: { type: String, required: true },
  image4: { type: String, required: true },
  location: { type: String },
  event_date: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminData' },
  add_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Event', ngoEventSchema)
