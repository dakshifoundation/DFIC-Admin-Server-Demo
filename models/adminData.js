const mongoose= require('mongoose')

const adminDataSchema= new mongoose.Schema({
       email: { type: String, require: true, unique: true},
       username: { type: String, require: true, unique: true},
       password: { type: String }
},
    { 
       timestamps: true 
    }
)

const adminData= mongoose.model('AdminData', adminDataSchema);

module.exports= adminData;