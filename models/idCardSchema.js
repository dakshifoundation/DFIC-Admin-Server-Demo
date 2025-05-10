const mongoose = require("mongoose")


const EmployeeSchema = new mongoose.Schema({
    NAME: { type: String, required: true },
    POSITION: { type: String, required: true },
    CONTACT: { type: String, required: true, match: /^[0-9]{10}$/ }, 
    EMAIL: { type: String, required: true, unique: true, lowercase: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    ADDRESS: { type: String, required: true },
    ECODE: { type: String, required: true, unique: true },
    FATHER: { type: String, required: true },
    DateOB: { type: Date, required: true },
    DateOJ: { type: Date, required: true },
    DateOE: { type: Date, required: true },
    ADHAR: { type: String, required: true, unique: true },
    BLOOD: { type: String, required: true },
    issued_by: { type: String, required: true },
    Id_url: { type: String, required: true },
    isActive:{type: Boolean, default: true},
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true })



const Employee = mongoose.model("Employee", EmployeeSchema)

module.exports = Employee
