const xss= require('xss')
const validator= require('validator')
const logger= require('../services/logging.winston.js')
const { isOnlyLetters }= require('../services/validationFunctions')



exports.validateAndSanitizeSignInInfo= async (req, res, next)=>{
    try{
        const { email, username, otp } = req.body
        const errors = [];

        if (!username || !validator.isLength(username, { min: 4 })) {
        errors.push('Name is required.')
        }else{
        req.body.username = xss(username.trim())
        const usernameRegex = /^[a-zA-Z0-9_.-]{4,}$/;
        if (!usernameRegex.test(req.body.username)) {
            errors.push('Name contains invalid characters.');
        }
        }

        if (!email || !validator.isEmail(email)) {
        errors.push('Email must be valid.');
        } else {
        req.body.email = xss(email.trim());
        }

        if (!otp || !validator.isNumeric(otp.toString()) || otp.toString().length !== 6) {
        errors.push("OTP must be a valid 6-digit numeric code.");
        } 
        
        if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
        }

        next();
    }catch(err){
        console.error("Error in Input Validation API: "+ err)
        logger.middlewaresLogger.error("Error in Input Validation Middleware: "+ err.message)
        return res.status(500).json({ msg: "Internal Server Error"})
    }
}


exports.checkRequiredFields= async (req, res, next)=>{
    try{
        const { NAME, RP, LOCATION, DATE, DESIGNATION, JOINING_DATE, SALARY, SALARY_IW } = req.body
        const fields = { NAME, RP, LOCATION, DATE, DESIGNATION, JOINING_DATE, SALARY, SALARY_IW }

        const missingFields = Object.keys(fields).filter(field => !fields[field])

        if (missingFields.length > 0) {
            return res.status(400).json({ success: false, message: `Missing required fields: ${missingFields.join(", ")}`})
        }

        if(!isOnlyLetters(NAME) || !isOnlyLetters(DESIGNATION)){
            return res.status(400).json({ success: false, message: "Fields should contain only letters."})
        }
        
        next();
    }catch(err){
        console.log("Error in data Validation middleware function", err.message)
        logger.middlewaresLogger.error("Error in data Validation middleware: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error."})
    }
} 