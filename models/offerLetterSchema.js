const mongoose = require("mongoose");

const OfferLetterSchema = new mongoose.Schema({
    offerLetterId: { type: String, required: true, unique: true },
    Name: {  type: String, required: true },
    jobTitle: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    issueDate: { type: Date, required: true },
    salary: { type: Number, required: true },
    issued_by: { type: String, required: true },
    offerLetterUrl: { type: String, required: true},
    uploadedAt: { type: Date, default: Date.now, }
},
{ timestamps: true })

const OfferLetter = mongoose.model("OfferLetter", OfferLetterSchema);
module.exports = OfferLetter;
