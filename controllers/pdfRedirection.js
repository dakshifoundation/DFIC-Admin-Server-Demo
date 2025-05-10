const IdCard= require('../models/idCardSchema.js')
const logger= require('../services/logging.winston.js')
const Certificate= require('../models/certificateSchema.js')
const Invoice= require('../models/invoice.schema.js')
const { handleMongodbConnection }= require('../services/connection.js')


exports.handleGetCertificateById= async (req, res)=>{
    try{
        const certificateId = req.params.certificate_id
        const certificate = await Certificate.findOne({ certificate_id: certificateId});

        if (!certificate) {
            return res.status(404).json({ success: false, message: `No Certificate found by Id: ${ certificateId }` })
        }

        return res.status(307).redirect(certificate.certificate_url)

    }catch(err){
        console.error("Error in the Get Certificate API: ", err.message)
        logger.adminUserControllers.error("Error in the Get Certificate API: "+ err.message)
        return res.status(500).json({ success: false, error: 'Internal Server Error'})
    }
}


exports.handleGetIdCardById= async (req, res)=>{
    try{
        const unique_id = req.params.unique_id
        const ID = await IdCard.findOne({ ECODE: unique_id });

        if (!ID) {
            return res.status(404).json({ success: false, message: `No ID-Card found by Id: ${ unique_id }` })
        }

        if(ID.isActive === false){
            return res.status(400).json({ success: false, message: `Id card with Id : ${ unique_id } is Expired.` })
        }

        return res.status(307).redirect(ID.Id_url)
        
    }catch(err){
        console.error("Error in the Get Certificate API: ", err.message)
        logger.adminUserControllers.error("Error in the Get Certificate API: "+ err.message)
        return res.status(500).json({ success: false, error: 'Internal Server Error'})
    }
}


exports.handleGetDonationCertificate= async(req, res)=>{
    try{
        const unique_id = req.params.unique_id
         let { db, client }= await handleMongodbConnection()

         try{
             if (!db || !client ) {  
                throw new Error("Database connection failed")
             }

             console.log("Database connection Opened for Redirection.")
             const collection= db.collection("payments")
             const data= await collection.findOne({ certificateId : unique_id })
                if(!data){
                    return res.status(404).json({ success: false, message: `No Donation Certificate found by Id: ${ unique_id }` })
                }
                
             return res.status(307).redirect(data.certificateUrl)

         }catch(err){
            console.log("Error in the Get Denation Certificate API: ", err.message)
            throw err

         }finally{
            if(client){
                await client.close()
                console.log("Database connection closed after redirection.")
            }
         }
            
    }catch(err){
        console.log("Error in the Get Denation Certificate API: ", err.message)
        console.log(err)
        logger.adminUserControllers.error("Error in the Get Denation Certificate API: "+ err.message)
        return res.status(500).json({ success: false, error: 'Internal Server Error'})
    }
}


exports.handleGetInvoiceById= async (req, res)=>{
    try{
        const invoice_id = req.params.invoice_id
        const invoice = await Invoice.findOne({ INC_ID: invoice_id})

        if (!invoice) {
            return res.status(404).json({ success: false, message: `No Invoice found by Id: ${ invoice_id }` })
        }

        return res.status(307).redirect(invoice.INVOICE_URL)

    }catch(err){
        console.error("Error in the Get Certificate API: ", err.message)
        logger.adminUserControllers.error("Error in the Get Certificate API: "+ err.message)
        return res.status(500).json({ success: false, error: 'Internal Server Error'})
    }
}
