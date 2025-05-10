const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    fullName: { type: String, default: "", trim: true },
    jobTitle: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    about: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true }, 
    user: { type: String, required: true, unique : true }
}, { timestamps: true })

const Profile = mongoose.model('Profile', profileSchema)

module.exports = Profile
