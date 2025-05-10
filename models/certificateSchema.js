const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
        certificate_id: {  type: String, required: true, unique: true },
        name: { type: String, required: true },
        issue_date: { type: Date, required: true },
        certificate_url: { type: String, required: true },
        issued_by: { type: String, required: true }
    },
    { timestamps: true });


const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
