const TeamMember= require('../models/teamMembers.schema')
const Partner= require('../models/partner.schema')
const Event= require('../models/events.schema')
const ProgramImage= require('../models/programImages.schema')
const logger= require('../services/logging.winston.js')
const { handleMongodbConnection }= require('../services/connection.js')



exports.handlePostDeleteTeamMember= async(req, res)=>{
    try{
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Valid ID is required.' })
        }

        const deleted = await TeamMember.findOneAndDelete({ id });
        if (!deleted) {
            return res.status(404).json({ success: false, message: `No team member found with id ${id}` })
        }

        logger.apiControllerLogger.info(`Team member data with id ${id} deleted.`)
        console.log(`Team member data with id ${id} deleted.`)
        return res.status(200).json({ success: true, message: `Team member data with id ${id} deleted.` })

    }catch(err){
        console.error('Error deleting team member:', err.message)
        logger.apiControllerLogger.error('Error deleting team member:'+ err.message)
        return res.status(500).json({ success: false, message: 'Server error while deleting team member data.' })
    }
}


exports.handlePostDeletePartner= async(req, res)=>{
    try{
        const { id } = req.body
        if (!id) {
            return res.status(400).json({ success: false, message: 'Valid ID is required.' })
        }

        const deleted = await Partner.findOneAndDelete({ id })
        if (!deleted) {
            return res.status(404).json({ success: false, message: `No Partner found with id ${id}` })
        }

        console.log(`Partner Data with id ${id} deleted.`)
        logger.apiControllerLogger.info(`Partner Data with id ${id} deleted.`)
        return res.status(200).json({ success: true, message: `Partner Data with id ${id} deleted.` })

    }catch(err){
        console.error('Server error while deleting Partner Data.', err.message)
        logger.apiControllerLogger.error('Server error while deleting Partner Data.'+ err.message)
        return res.status(500).json({ success: false, message: 'Server error while deleting Partner Data.' })
    }
}



exports.handlePostDeleteEvent= async(req, res)=>{
    try{
        const { id } = req.body
        if (!id) {
            return res.status(400).json({ success: false, message: 'Valid ID is required.' })
        }

        const deleted = await Event.findOneAndDelete({ event_id: id })
        if (!deleted) {
            return res.status(404).json({ success: false, message: `No Event found with id ${id}` })
        }

        console.log(`Event Data with id ${id} deleted.`)
        logger.apiControllerLogger.info(`Event Data with id ${id} deleted.`)
        return res.status(200).json({ success: true, message: `Event Data with id ${id} deleted.` })

    }catch(err){
        console.error('Server error while deleting Event Data.', err.message)
        logger.apiControllerLogger.error("Server error while deleting Event Data.: "+ err.message)
        return res.status(500).json({ success: false, message: 'Server error while deleting event Data.' })
    }
}


exports.handlePostDeleteProgramImge= async(req, res)=>{
    try{
        const { id , program_field } = req.body
        if (!id  || !program_field ) {
            return res.status(400).json({ success: false, message: 'Valid id and program_field is required.' })
        }

        const deleted = await ProgramImage.findOneAndDelete({ image_id: id, program_fields: program_field  })
        if (!deleted) {
            return res.status(404).json({ success: false, message: `No Image found with id ${id} and field ${program_field}` })
        }

        console.log(`Image Data with id ${id} deleted.`)
        logger.apiControllerLogger.info(`Image Data with id ${id} deleted.`)
        return res.status(200).json({ success: true, message: `Image with id ${id} deleted.` })

    }catch(err){
        console.error('Server error while deleting image Data.', err.message)
        logger.apiControllerLogger.error('Server error while deleting image Data.'+ err.message)
        return res.status(500).json({ success: false, message: 'Server error while deleting image Data.' })
    }
}


exports.handlePostDeleteInternshipData= async(req, res)=>{
    const {db , client } = await handleMongodbConnection()
        try{ 
            if (!db || !client ) {  
                throw new Error("Database connection failed")
            }

            const { ObjectId } = require('mongodb')
            const { id }= req.body
                if(!id){
                    return res.status(400).json({ success: false, message: 'Provide _id.' })
                }
    
            const collection = db.collection('internshipregistrations')
            const deleted = await collection.findOneAndDelete({ _id: new ObjectId(id) })
             
            if(!deleted){
                return res.status(404).json({ success: false, message: 'No Data.' })
            }
            
            console.log(`Internship Data for ${id} deleted. `)
            logger.apiControllerLogger.info(`Internship Data for ${id} deleted. `)
            return res.status(200).json({ success: true, message: 'Data Deleted Successfully.', data: deleted })
    
        }catch(err){
            console.error('Error in Delete Internship Data:', err.message)
            logger.apiControllerLogger.error(`Error in Delete Internship Data:: ${err.message}`)
            return res.status(500).json({ success: false, message: 'Internal Server Error' })
    
        }finally{
            if(client){
                await client.close()
            }
        }
}


exports.handlePostDeleteContactUsData= async(req, res)=>{
    const {db , client } = await handleMongodbConnection()
        try{ 
            if (!db || !client ) {  
                throw new Error("Database connection failed")
            }

            const { ObjectId } = require('mongodb')
            const { id }= req.body
                if(!id){
                    return res.status(400).json({ success: false, message: 'Provide _id.' })
                }
    
            const collection = db.collection('contactmessages')
            const deleted = await collection.findOneAndDelete({ _id: new ObjectId(id) })
             
            if(!deleted){
                return res.status(404).json({ success: false, message: 'No Data.' })
            }
            
            console.log(`Contact Us Data for ${id} deleted. `)
            logger.apiControllerLogger.info(`Contact Us Data for ${id} deleted. `)
            return res.status(200).json({ success: true, message: 'Data Deleted Successfully.', data: deleted })
    
        }catch(err){
            console.error('Error in Contact Us Data deletion:', err.message)
            logger.apiControllerLogger.error(`Error in Contact Us Data deletion:: ${err.message}`)
            return res.status(500).json({ success: false, message: 'Internal Server Error' })
    
        }finally{
            if(client){
                await client.close()
            }
        }
}