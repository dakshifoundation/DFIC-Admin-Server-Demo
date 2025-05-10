const mongoose= require('mongoose')
const sgMail= require('@sendgrid/mail')
const logger= require('../services/logging.winston.js')
const adminCreationOTP = require('../models/adminCreationOTP.js')
sgMail.setApiKey(process.env.SendGrid)


exports.sendSignUpOTP= async (email, otp) =>{
    const session= await mongoose.startSession()

    const msg= {
        to: email,
        from: process.env.SenderEmail,
        subject: 'Account Verification OTP',
        text: `Dear User,

Your One-Time Password (OTP) for account creation is: ${otp}

For security reasons, please do not share this OTP with anyone.  
This OTP is valid for 3 minutes only.

If you did not request this OTP or need assistance, please contact our support team at ${process.env.SupportEmail}.

Best regards,  
Dakshi Foundation`
    }
    
    try{
        session.startTransaction();
        const newotp= await adminCreationOTP.create([{ email, otp}], { session })
        await sgMail.send(msg)
        await session.commitTransaction();
        
    }catch(err){
        if(session.inTransaction()){
            await session.abortTransaction();
        }
        console.error("Error in the Sign-up otp sending function"+err.message)
        logger.servicesLogger.error("Error in the Sign-up otp sending SERVICE function. "+ err.message)
        throw err

    }finally{
        if(session){
            await session.endSession();
        }
    }
}


exports.sendForgetPassOTP= async (email, otp) =>{
    const session= await mongoose.startSession();
    const msg= {
        to: email,
        from: process.env.SenderEmail,
        subject: 'Password Reset OTP Code',
        text: `Dear User,

Your One-Time Password (OTP) for resetting your password is: ${otp}

For security reasons, please do not share this code with anyone.

If you did not request this OTP or need assistance, please contact our support team at ${process.env.SupportEmail}.

Best regards,  
Dakshi Foundation`
    }

    try{
        session.startTransaction();
        const newotp= await adminCreationOTP.create([{ email, otp}], { session })
        await sgMail.send(msg)
        await session.commitTransaction();

    }catch(err){
        if(session.inTransaction()){
            await session.abortTransaction();
        }
        console.error("Error in the forget password otp sending function"+ err.message)
        logger.servicesLogger.error("Error in the forget password otp sending SERVICE function"+ err.message)
        throw err

    }finally{
        if(session){
            await session.endSession();
        } 
    }
}



exports.sendEmailWithAttachment= async (email, pdfBuffer, NAME)=>{
    try {
        const pdfBase64 = pdfBuffer.toString('base64')
        const msg = {
            to: email,
            from: process.env.SenderEmail,
            subject:`Donation Certificate – Thank You for Your Generosity`,
            text: `Dear ${NAME},

Thank you for your generous support towards Dakshi Foundation. Your contribution plays a vital role in making a difference.

Please find attached your donation certificate as a token of our appreciation. If you have any questions or need further assistance, feel free to reach out.

Best regards,  
Dakshi Foundation Team`,
            attachments: [
                {
                    content: pdfBase64,
                    filename: "DFIC-Certificate",
                    type: 'application/pdf',
                    disposition: 'attachment',
                },
            ],
        }
        await sgMail.send(msg)
        
    } catch (err) {
        console.error("Error in the Sending PDF with Email "+err.message)
        logger.servicesLogger.error("Error in the Sending PDF with Email  "+ err.message)
        throw err
    }
}

