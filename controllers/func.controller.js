const Events= require('../models/events.schema')
const TeamMember= require('../models/teamMembers.schema.js')
const NgoPartners= require('../models/partner.schema.js')
const logger= require('../services/logging.winston')
const { uploadFileToS3 }= require('../services/s3UploadImages')
const path= require('path')
const ProgrameImage= require('../models/programImages.schema.js')
const { handleMongodbConnection }= require('../services/connection.js')
const Certificate= require('../models/certificateSchema.js')
const OfferLetter= require('../models/offerLetterSchema.js')
const Invoice= require('../models/invoice.schema.js')
const IdCard= require('../models/idCardSchema.js')



exports.handleGetEvents= async(req, res)=>{
    try{
        const events= await Events.find({})
                            .sort({ created_at: -1 })

        console.log("Events fetched successfully.")
        return res.status(200).json({ success: true, message: 'Events fetched successfully.', data: events })

    }catch(err){
        console.error('Error fetching events:', err)
        res.status(500).json({ success: false, message: 'Something went wrong while fetching events.'})
    }
}


exports.handleGetTeamMembers= async(req, res)=>{
    try{
        const events= await TeamMember.find({})
        console.log("Team Members Data fetched successfully.")
        return res.status(200).json({ success: true, message: 'Team Members Data fetched successfully.', data: events })

    }catch(err){
        console.error('Error fetching events:', err)
        res.status(500).json({ success: false, message: 'Something went wrong while fetching team-members-data.'})
    }
} 


exports.handleGetNgoPartners= async(req, res)=>{
    try{
        const events= await NgoPartners.find({})
        console.log("NGO Partners Data fetched successfully.")
        return res.status(200).json({ success: true, message: 'NGO Partners Data fetched successfully.', data: events })

    }catch(err){
        console.error('Error fetching events:', err)
        res.status(500).json({ success: false, message: 'Something went wrong while fetching ngo-partner-data.'})
    }
}



exports.handleGetAllCertificatesData= async(req, res)=>{
    try{
        const certificates= await Certificate.find({})
                            .sort({ created_at: -1 })
                            
        console.log('All Certificates fetched successfully.')
        return res.status(200).json({ success: true, message: 'All Certificates fetched successfully.', data: certificates  })

    }catch(err){
        console.error('Error fetching certificates data:', err)
        return res.status(500).json({ success: false, message: 'Something went wrong while fetching data.'})
    }
}


exports.handleGetAllIdCardData= async(req, res)=>{
    try{
        const idCard= await IdCard.find({})
                            .sort({ created_at: -1 })
                            
        console.log('All Id-cards fetched successfully.')
        return res.status(200).json({ success: true, message: 'All Id-cards fetched successfully.', data: idCard  })

    }catch(err){
        console.error('Error fetching Id-cards data:', err)
        return res.status(500).json({ success: false, message: 'Something went wrong while fetching data.'})
    }
}


exports.handleGetAllInvoiceData= async(req, res)=>{
    try{
        const invoices= await Invoice.find({})
                            .sort({ created_at: -1 })
                            
        console.log('All invoice fetched successfully.')
        return res.status(200).json({ success: true, message: 'All invoice fetched successfully.', data: invoices })

    }catch(err){
        console.error('Error fetching invoice data:', err)
        return res.status(500).json({ success: false, message: 'Something went wrong while fetching data.'})
    }
}


exports.handleGetAllOfferLetterData= async(req, res)=>{
    try{
        const invoices= await OfferLetter.find({})
                            .sort({ created_at: -1 })
                            
        console.log('All Offer letters fetched successfully.')
        return res.status(200).json({ success: true, message: 'All Offer letters fetched successfully.', data: invoices })

    }catch(err){
        console.error('Error fetching Offer letters data:', err)
        return res.status(500).json({ success: false, message: 'Something went wrong while fetching data.'})
    }
}


exports.handleGetInternshipData=async (req, res)=>{
    const {db , client } = await handleMongodbConnection()
    try{ 
        if (!db || !client ) {  
            throw new Error("Database connection failed")
        }

        const collection = db.collection("internshipregistrations")
        const data = await collection.find({})
                                     .sort({ createdAt: -1 })
                                     .toArray()

        if(data.length === 0){
            return res.status(404).json({ success: false, message: 'No Registration Data.' })
        }

        return res.status(200).json({ success: true, data: data })

    }catch(err){
        console.error('Error in Get Internship Data:', err.message)
        logger.apiControllerLogger.error(`Error in Get Internship Data:: ${err.message}`)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })

    }finally{
        if(client){
            await client.close()
        }
    }
}


exports.handleGetContactMessages=async (req, res)=>{
    const {db , client } = await handleMongodbConnection()
    try{ 
        if (!db || !client ) {  
            throw new Error("Database connection failed")
        }

        const collection = db.collection("contactmessages")
        const data = await collection.find({})
                                     .sort({ createdAt: -1 })
                                     .toArray()

        if(data.length === 0){
            return res.status(404).json({ success: false, message: 'No Registration Data.' })
        }

        return res.status(200).json({ success: true, data: data })

    }catch(err){
        console.error('Error in Get Contact Messages:', err.message)
        logger.apiControllerLogger.error(`Error in Program Images API:: ${err.message}`)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })

    }finally{
        if(client){
            await client.close()
        }
    }
}


exports.handlePostEvents= async(req, res)=>{
    try{
        const { title, purpose, description, location, event_date } = req.body
        const created_by= req.user.id
        
        if (!title || !purpose || !description || !location || !event_date || !req.files?.image1 || !req.files?.image2  || !req.files?.image3  || !req.files?.image4 ) {
            return res.status(400).json({ success: false, message: 'Title, purpose, and description are required.' })
        }

        const event_id= Math.floor(10000 + Math.random() * 90000)
        const aws_folder= `event-images`

        const [Image1, Image2, Image3, Image4] = await Promise.all([
            uploadFileToS3(req.files.image1[0], aws_folder, event_id),
            uploadFileToS3(req.files.image2[0], aws_folder, event_id),
            uploadFileToS3(req.files.image3[0], aws_folder, event_id),
            uploadFileToS3(req.files.image4[0], aws_folder, event_id)
         ])

        console.log(`Event Id: ${event_id} Images uploaded successfully on S3 Bucket.`)
        logger.apiControllerLogger.info(`Event Id: ${event_id} Images uploaded successfully on S3 Bucket.`)

        const events= new Events({
            event_id: event_id,
            title,
            purpose,
            description,
            image1 : Image1,
            image2 : Image2,
            image3 : Image3,
            image4 : Image4,
            location,
            event_date,
            add_by: req.user.username,
            created_by
        })

        await events.save()

        console.log(`Event Id: ${event_id} Added SuccessFully.`)
        logger.apiControllerLogger.info("Event Added SuccessFully.")

        return res.status(200).json({ success: true, message: 'Event added successfully', events})

    }catch(err){
        console.error("Error in the Event Addition: ", err.message)
        logger.apiControllerLogger.error("Error in the Event Addition API: ", + err.message)
        return res.status(500).json({ success: false, message: 'Internal Server Error'})
    }
}


exports.handleAddTeamMembers= async(req, res)=>{
    try{
        const { name, role, description } = req.body
        const file = req.file
        if (!name || !role || !description || !file) {
            return res.status(400).json({ success: false, message: 'All fields including image file are required.' });
        }
        const fileExtension = path.extname(file.originalname)
        const id= Math.floor(1000 + Math.random() * 9000)

        const aws_folder= `team-members`
        const imageUrls = await uploadFileToS3(file, aws_folder, id)
        
        const newMember = new TeamMember({
            id: id,
            name,
            role,
            description,
            image: imageUrls
          })

          await newMember.save()
          console.log(`Team Member Id: ${id} Added SuccessFully.`)
          logger.apiControllerLogger.info("Team Member Added SuccessFully.")

          return res.status(200).json({ success: true, message: 'Team member added', member: newMember })

    }catch(err){
        console.error('Error saving team member:', err.message)
        logger.apiControllerLogger.error('Error saving team member:', + err.message)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostPartners= async(req, res)=>{
    try{
        const { name, description, contactPerson, email } = req.body
        if (!name || !description || !contactPerson || !email) {
            return res.status(400).json({ success: false, message: 'Name, description, contactPerson, and email are required.'})
        }

        if (!name || !description || !contactPerson || !email || !req.files?.image1 || !req.files?.image2) {
            return res.status(400).json({ message: 'All fields and both images are required.' })
          }
        
        const partner_id = Math.floor(1000 + Math.random() * 9000)
        const aws_folder = 'ngo-partners'

        const [personImageUrl, companyLogoUrl] = await Promise.all([
           uploadFileToS3(req.files.image1[0], aws_folder, partner_id),
           uploadFileToS3(req.files.image2[0], aws_folder, partner_id)
        ])

        const partner= new NgoPartners({
            id: partner_id,
            name,
            description,
            contactPerson,
            email,
            person_image: personImageUrl,
            company_logo: companyLogoUrl
        })

        await partner.save()

        console.log(`Partner ID: ${partner_id} saved successfully`)
        logger.apiControllerLogger.info(`Partner ID: ${partner_id} saved successfully`)

        return res.status(201).json({ success: true, message: 'Partner added successfully', partner})

    }catch(err){
        console.error('Error adding partner:', err.message)
        logger.apiControllerLogger.error(`Error adding partner: ${err.message}`)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}


exports.handlePostProgramImages= async(req, res)=>{         // Need to change
    try{
        let { program_field } = req.body
        const file = req.file

        let image_id= Math.floor(1000 + Math.random() * 9999)

        image_id = Number(image_id)
        if (isNaN(image_id)) {
            throw new Error(`Invalid number string: "${str}"`)
        }
       
        if (image_id === undefined || typeof image_id !== 'number' || image_id < 1000 || image_id > 9999 || !file ) {
            return res.status(400).json({ success: false, message: 'image_id is required and must be a number between 1 and 40' })
        }

        if (!program_field || typeof program_field !== 'string') {
            return res.status(400).json({ success: false, message: 'program_fields is required and must be a string' })
        }

        const existing = await ProgrameImage.findOne({ image_id: image_id, program_fields: program_field })
            if (existing) {
                return res.status(409).json({ success: false, message: 'Image with this ID already exists' })
            }
        
        const aws_folder= `program-images`
        const imageUrl = await uploadFileToS3(file, aws_folder, image_id)
        const newImage = new ProgrameImage({ 
            image_id,
            image_url : imageUrl,
            program_fields : program_field, 
            added_by : req.user.username
         })

         await newImage.save()

         console.log(`Program Image : ${image_id} saved successfully`)
         logger.apiControllerLogger.info(`Program Image : ${image_id} saved successfully`)

         return res.status(200).json({ success: true, message: 'Image uploaded successfully', data: newImage })

    }catch(err){
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: 'image_id must be unique' })
          }
        console.error('Error in Adding Program:', err.message)
        logger.apiControllerLogger.error(`Error in Adding Program: ${err.message}`)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })
    }
}



exports.handlePostGetAllProgramImages=async (req, res)=>{
    const {db , client } = await handleMongodbConnection()
    try{ 
        if (!db || !client ) {  
            throw new Error("Database connection failed")
        }

        const { program_field }= req.body
        if(!program_field){
            return res.status(400).json({ success: false, message: 'No program_fieldPresent' })
        }

        const collection = db.collection("images")
        const data = await collection.find({ program_fields: program_field })
                                     .sort({ createdAt: -1 })
                                     .toArray()

        if(data.length === 0){
            return res.status(404).json({ success: false, message: 'No Images Data for given field' })
        }

        return res.status(200).json({ success: true, data: data })

    }catch(err){
        console.error('Error in Program Images API:', err.message)
        logger.apiControllerLogger.error(`Error in Program Images API:: ${err.message}`)
        return res.status(500).json({ success: false, message: 'Internal Server Error' })

    }finally{
        if(client){
            await client.close()
        }
    }
}