const mongoose= require('mongoose')

const adminCreationOTPSchema= mongoose.Schema({
      email : { type: String, required: true,unique: true },
      otp: { type:Number, required: true},
      createdAt: { type: Date, default: Date.now, expires: 120 }
    },
    { 
      timestamps: true 
    }
)

const adminCreationOTP= mongoose.model('adminCreationOTP', adminCreationOTPSchema);

module.exports= adminCreationOTP;