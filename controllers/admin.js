const sanitize= require('mongo-sanitize')
const adminData = require('../models/adminData.js')
const logger= require('../services/logging.winston.js')
const { decodeToken }= require('../services/jwtToken.js')
const { hashPassword, verifyPassword }= require('../services/passwordHashing.js')
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3")
const { S3Client }= require('../services/AWSs3Connection.js')
const path= require('path')
const fs= require('fs')
const Profile = require('../models/adminProfile.js')
const { validationResult } = require('express-validator')
const validateProfile = require('../middlewares/profileDataValidation.js')



exports.handleGetAdminHomePage= async (req, res)=>{
    try{
        return res.status(200).json ({ success: true, message: "Welcome to Home Page."})
    }catch(err){
        console.error("Error in Home Page API: "+err)
        logger.adminUserControllers.error("Error in Home Page API.")
        return res.status(500).json({ success: false, message: "Internal Server Error."})
    }
}


exports.handleGetProfileInfo= async(req, res)=>{
    try{
        const username= req.user.username
    
        if (!username) {
            return res.status(401).json({ success: false, message: "User unauthorized." })
        }
        const profile = await Profile.findOne({ user: username })
        if (!profile) {
            return res.status(404).json({ success: false, message: "Profile not found." })
        }
        console.log("Data sent.")
        return res.status(200).json({ success: true, message: "data sent", profile: profile})

    }catch(err){
        console.error("Error in Admin profile GET API: "+err.message)
        logger.adminUserControllers.error("Error in Admin profile Get API. " +err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error."})
    }

}



exports.handleAdminProfile= async (req,res)=>{
    let imageFile
    try{
        const username = req.user.username
            if (!req.file) {
                console.log("No file")
                return res.status(400).json({ success: false, message: "No file uploaded." })
            }

        const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ success: false, errors: errors.array().map(err => err.msg) })
            }
        
        const user = await adminData.findOne({ username })
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" })
            }

        imageFile = req.file
        const imagePath = path.join(__dirname, '..', 'uploads', imageFile.filename)
        const fileStream = fs.createReadStream(imagePath)

        const fileKey = `Id-Cards/${Date.now()}-${imageFile.originalname}`

        const uploadParams = {
            Bucket: process.env.AWS_Bucket,
            Key: fileKey,
            Body: fileStream,
            ContentType: imageFile.mimetype,
            ACL: 'public-read',
        }

        try {
            const commandToUpload = new PutObjectCommand(uploadParams)
            const response = await S3Client.send(commandToUpload)
            console.log("Profile image uploaded successfully on S3 Bucket.")
            logger.apiControllerLogger.info("Profile image uploaded successfully on S3 Bucket.")

        }catch(err) {
            console.error("Error uploading file to S3:", err.message)
            logger.apiControllerLogger.error("Error uploading file to S3: "+ err.message)
            throw new Error("Failed to upload file to S3. Please try again.")
        }

        const fileUrl = `https://${process.env.AWS_Bucket}.s3.${process.env.AWS_Region}.amazonaws.com/${fileKey}`
    
         let profile
         try{
         const profileData = {
                fullName: req.body.fullName ,
                jobTitle: req.body.jobTitle ,
                location: req.body.location ,
                about: req.body.about ,
                image: fileUrl,
                user: user.username
              }
    
              profile = await Profile.findOneAndUpdate(
                { user: user.username },
                profileData,
                { new: true, upsert: true, setDefaultsOnInsert: true }
              )
    
         }catch(err){
              console.error("Error in Admin profile API:", err.message)
              throw err
         }

         if (imageFile && imageFile.path) {
            try {
                await fs.promises.unlink(imageFile.path)
                console.log("Local file deleted successfully.")
            } catch (err) {
                console.error("Failed to delete local file:", err)
            }            
        }
        console.log("Profile updated successfully")
        res.status(200).json({ success: true, message: "Profile updated successfully", profile })

    }catch(err){
        if (imageFile && imageFile.path) {
            try {
                await fs.promises.unlink(imageFile.path);
                console.log("Local file deleted successfully.");
            } catch (err) {
                console.error("Failed to delete local file:", err);
            }  
        }
        console.error("Error in Admin profile API: "+err.message)
        logger.adminUserControllers.error("Error in Admin profile API. " +err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error."})

    }
}



exports.handleAdminPasswordChange= async (req, res)=>{
    try{
        if (!req.user || !req.user.username) {
            return res.status(401).json({ success: false, message: "Unauthorized access." });
        }

        const  username = req.user.username;        
        const { password, newPassword, confirmPassword }= {
                                                            password: sanitize(req.body.password),
                                                            newPassword: sanitize( req.body.newPassword), 
                                                            confirmPassword: sanitize(req.body.confirmPassword)
                                                          }

        if (!password || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        if(!(newPassword===confirmPassword)){
            return res.status(400).json({ success: false, message: "Enter same password in both fields."})
        }

       const user= await adminData.findOne({ username: username})
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found." });
            }

       const match= await verifyPassword(user.password, password);
            if(!match){
                return res.status(400).json({ success: false, message: "Old password is wrong."})
            }

       const hashedPassword= await hashPassword(newPassword);
       console.warn("An attemp made by user "+username+" to change password")
       logger.adminUserControllers.warn(`An attemp made by user ${username} to change password`)

       const filter= {username : username}
       const update= { $set : {password : hashedPassword }}

       const result= await adminData.updateOne( filter, update)
            if(result.matchedCount===0){
                return res.status(404).json({ success: false, message: "Not Found."})
            }else if (result.modifiedCount === 0) {
                console.warn("Password update attempted but no changes were made.");
                logger.adminUserControllers.warn(`Password update attempted but no changes were made by ${username}`)
                return res.status(200).json({ success: false, message: "No changes were made to the password." });
            }
       console.log(`Password changed successfully by user ${username}`)
       logger.adminUserControllers.warn(`Password changed successfully by user ${username}`)
       return res.status(200).json({ success: true, message: "Password changed successfully."})

    }catch(err){
        console.error("Error in Password Reseting from old-password API: "+err.message)
        logger.adminUserControllers.error("Error in Password Reseting from old-password API. " +err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error."})
    }
}



exports.handleAdminLogout= async (req, res)=>{
    try{
        const authHeader= req.headers['authorization']
        let token;
        if( authHeader && authHeader.startsWith('Bearer ')){
            token= authHeader.slice(7)
        }
        const tokenBlacklist = req.app.locals.tokenBlacklist;

        if (!token) {
            return res.status(400).json({ success: false, message: 'No token provided for logout.' });
        }

        const decoded = await decodeToken(token)
            if (!decoded) {
                return res.status(400).json({ success: false, message: 'Invalid token.' });
            }

        tokenBlacklist[token] = decoded.exp * 1000
        console.warn(`Token blacklisted `)
        logger.adminUserControllers.warn(`Token is blacklisted`)
   
        return res.status(200).json({ success: true, message : `User logged-out`})

    }catch(err){
        console.error("Error in Log-out API: "+err.message)
        logger.adminUserControllers("Error in Log-out API. " + err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error."})
    }
}