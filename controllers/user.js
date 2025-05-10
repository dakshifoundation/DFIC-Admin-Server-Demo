const crypto= require('crypto')
const validator= require('validator')
const sanitize= require('mongo-sanitize')
const adminData = require('../models/adminData.js')
const logger= require('../services/logging.winston.js')
const { createJwtToken, verifyToken }= require('../services/jwtToken.js')
const adminCreationOTP = require('../models/adminCreationOTP.js')
const { hashPassword, verifyPassword }= require('../services/passwordHashing.js')
const { sendSignUpOTP, sendForgetPassOTP}= require('../services/emailService.js')
const Profile= require('../models/adminProfile.js')
const { componentsToColor } = require('pdf-lib')



const secret= process.env.Secret


exports.handleSendEmailForSignUp= async ( req, res)=>{
    try{
        const { email }= req.body;
            if(!email)  { 
                return res.status(400).json({ success: false, message: "Email is required."})
            }

        const isValidEmail = validator.isEmail(email)
            if (!isValidEmail){
              return res.status(400).json({ success: false, message: "Not valid email."})
            }

        const allowedDomains= [ process.env.AllowedDomain ]
        const domain= email.substring(email.lastIndexOf("@")+1)
        const tempMail= allowedDomains.includes(domain.toLowerCase());
            // if(!tempMail){
            //     return res.status(400).json({ success: false, message: "unauthorized email domain."})
            // }
        
        const user= await adminData.findOne({ email: email})
            if( user ) {
                return res.status(400).json( {success: false, message: "Email already exists."})
            }
        
        const otp= await crypto.randomInt(100000, 999999).toString();
        await sendSignUpOTP( email, otp)

        console.log(`OTP sent successfully User SignUp.`)
        logger.adminUserControllers.info(`OTP sent successfully User SignUp.`)
      
        return res.status(200).json( {success: true, message: `OTP sent successfully to the ${email}`, email: email})

    }catch(err){
        console.error("Error in sending Email for sign-up: "+err.message)
        logger.adminUserControllers.error("Error in sending Email for sign-up: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal server Error"})
    }
}



exports.handlePostSignUpData= async (req, res)=>{
    let email
    let otpDeleted
    try{
        const { username, password, otp}= { 
                                            username: sanitize(req.body.username),
                                            password: sanitize(req.body.password),
                                            otp: sanitize(req.body.otp)
                                            }
        email= sanitize( req.body.email) 

        const user= await adminData.findOne({ email: email}).lean()
            if( user ) {
                return res.status(400).json( {success: false, message: "Email already exists."})
            }
            
        const storedOTP= await adminCreationOTP.findOne({ email, otp})
            if(!storedOTP){
                return res.status(400).json({ success: false, message: "Invalid OTP."})
            }
        
        const hashedPassword= await hashPassword(password);
        const result= await adminData.create({
            email:  email ,
            username:  username,
            password:  hashedPassword
        })
        console.log(`New user created successfully`)
        logger.adminUserControllers.info("New user created successfully")

        try{
            const result= await Profile.create({
                fullName: " ",
                jobTitle: " ",
                location: " ",
                about:  " ",
                image: "https://t4.ftcdn.net/jpg/04/75/00/99/360_F_475009987_zwsk4c77x3cTpcI3W1C1LU4pOSyPKaqi.jpg",
                user: username
            })
        }catch(err){
            console.error("Error in creating user profile while sign-up: "+ err.message)
        }

        otpDeleted= await adminCreationOTP.deleteOne({email:{ $eq: email },otp:{ $eq: otp }})

        console.log("OTP cleared from database.")
        logger.adminUserControllers.info("OTP cleared from database.")

        return res.status(200).json({success: true, message: "New user created successfully."})

    }catch(err){
        console.error("Error in user creation API: "+err)
        logger.adminUserControllers.error("Error in user creation API: " + err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error."})

    }finally{
        await adminCreationOTP.deleteOne({email:{ $eq: email } })
    }
}


exports.handlePostUserLogin= async (req, res)=>{
    try{
        const {username, password }= { username: sanitize(req.body.username),  password: sanitize(req.body.password) }
              if( !username || !password)  { 
                 return res.status(400).json({ success: false, message: "Username and password are required."})
              }

        const user= await adminData.findOne( {username: username})
             if( !user){
                const dummyHash= "$argon2d$v=19$m=12,t=3,p=1$ajUydGFhaWw4ZTAwMDAwMA$MRhztKGcPpp8tyzeH9LvDQ"
                await verifyPassword( dummyHash, password)
                return res.status(400).json({ success: false, message: "Invalid username or password"})
             }
     
        const match= await verifyPassword(user.password, password)
             if(!match){
                return res.status(400).json({ success: false, message: "Invalid username or password"})
             }

        const id= user._id;
        const session_id= await createJwtToken( username, id, secret)
        
        console.log(`user logged in.`)
        logger.adminUserControllers.info("user logged in.")

        return res.status(200).json({ success: true, message:"log in successfull", token: session_id})
        
    }catch(err){
        console.error("Error in user login API: ", err.message)
        logger.adminUserControllers.error("Error in user login API: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error."})
    }
}


exports.handleSendEmailForForgetPassword= async (req, res)=>{
    try{
        const { email, username }= { username: sanitize(req.body.username), email: sanitize(req.body.email) }
            if(!email || !username)  { 
                return res.status(400).json({ success: false, message: "Email and Username are required."})
            }

        const isValidEmail = validator.isEmail(email);
            if (!isValidEmail) {
                return res.status(400).json({ success: false, message: "Enter valid Email."})
            }

        const sanitizedUsername = validator.trim(username);
        const usernameRegex = /^[a-zA-Z0-9_.-]{4,}$/;
        const isValidUsername = usernameRegex.test(sanitizedUsername);
            if (!isValidUsername) {
                return res.status(400).json( { success: false, message: "Enter valid username.It must be 4 character atleast and only contain letters, numbers, '_', '-', or '.' "})
            }

        const result= await adminData.findOne({ email: email, username: sanitizedUsername})
            if(!result){
                return res.status(400).json({ success: false, message: "No user with provided email and username."})
            }
        
        const otp= await crypto.randomInt(100000, 999999).toString();
        await sendForgetPassOTP( email, otp)
        console.warn("OTP for password-reseting sent successfully.")
        logger.adminUserControllers.warn("OTP for password-reseting sent successfully.")
       
        return res.status(200).json({ success: true, message: "Email send successfully for password reset.", email: email, username: sanitizedUsername})

    }catch(err){
        console.error("Error in sending Email for password reset: "+err.message)
        logger.adminUserControllers.error("Error in API sending Email for password reset: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal server Error"})
    }
}


exports.handlePostForgetPasswordOTP= async (req, res)=>{
  try{
        let otpDeleted= false
        const { email, confirmpassword, newpassword, otp}={
            email: sanitize( req.body.email), 
            confirmpassword: sanitize(req.body.confirmpassword),
            newpassword: sanitize(req.body.newpassword),
            otp: sanitize(req.body.otp)
        }
        try{
                if(!email || !confirmpassword || !newpassword || !otp)  {
                    return res.status(400).json({ success: false, message: "All the fields are required."})
                }

                if( !(confirmpassword === newpassword) ){
                    return res.status(400).json({ success: false, message: "Enter same password in both fields."})
                }

            const isValidEmail = validator.isEmail(email)
                if (!isValidEmail) {
                    return res.status(400).json({ success: false, message: "Enter valid Email Address."})
                }

            const user= await adminData.findOne({ email: email})
                if(!user){
                    return res.status(400).json({ success: false, message: "No user account with provided email."})
                }

            const result= await adminCreationOTP.findOne({email: email, otp: otp })
                if(!result){
                    return res.status(400).json({ success: false, message: "Invalid OTP"})
                }

            const hashedPassword= await hashPassword(newpassword);
            console.warn("Password reset attempt detected.")
            logger.adminUserControllers.warn("Password reset attempt detected.")

            const updatedUser = await adminData.findOneAndUpdate(
                { email },
                { $set: { password: hashedPassword } },
                { new: true }
            )

            if (!updatedUser) {
                return res.status(500).json({ success: false, message: "Password update failed." });
            }

            otpDeleted= await adminCreationOTP.deleteOne({email:{ $eq: email }})
            
            console.warn("Password changed successfully.")
            logger.adminUserControllers.warn("Password changed successfully.")
            return res.status(200).json({ success: true, message: `Password changed successfully.`})

        }catch(err){
            console.error("Error in changing password and handling OTP API: "+err.message)
            logger.adminUserControllers.error("Error in changing password and handling OTP API: "+ err.message)
            return res.status(500).json({ success: false, message: "Internal server Error"})

        }finally{
            if(otpDeleted===false){
                await adminCreationOTP.deleteOne({email:{ $eq: email }})
            }
        }

  }catch(err){
        console.error("Error in changing password and handling OTP API: "+ err.message)
        logger.adminUserControllers.error("Error in changing password and handling OTP API: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal server Error"})
  }
}


exports.JWTtokenVerification= async (req, res)=>{
    try{
        const token = req.headers.authorization?.split(" ")[1];
        const tokenBlacklist = req.app.locals.tokenBlacklist;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication token is missing.' });
        }
        
        if (token && tokenBlacklist[token]) {
            const currentTime = Date.now();
            const expirationTime = tokenBlacklist[token];

            if (currentTime < expirationTime) {
                return res.status(401).json({ success: false, message: 'Token is blacklisted.' });
            }
            // delete tokenBlacklist[token];
        }

        let user;
        try {
             user = await verifyToken(token, secret);
        } catch (err) {
             if (err.name === 'TokenExpiredError') {
                 return res.status(401).json({ success: false, message: 'Token has expired.' });
             }
             return res.status(401).json({ success: false, message: 'Invalid token.' });
        }

        if(!user){
             return res.status(401).json({ success: false, message: 'Invalid token.' });
        }
        return res.status(200).json({ success: true, message: "Token verified" })

    }catch(err){
        console.error("Error in the Token-authentication Middleware: "+ err.message);
        logger.middlewaresLogger.error("Error in the cookie-authentication API: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error." })
    }
}