const mongoose = require('mongoose')

const teamMemberSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, min: 1000, max: 9999 },
  name: { type: String, required: true },
  role: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true }
}, { timestamps: true })

const TeamMember = mongoose.model('TeamMember', teamMemberSchema)

module.exports = TeamMember
