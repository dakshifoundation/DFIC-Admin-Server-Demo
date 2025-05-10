const fs= require('fs')
const path= require('path')
const util= require('util')
const QRCode= require('qrcode')
const Pizzip= require('pizzip')
const crypto= require('crypto')
const cron = require("node-cron")
const mongoose = require('mongoose')
const { exec }= require('child_process')
const Docxtemplater= require('docxtemplater')
const { PDFDocument, rgb } = require('pdf-lib')
const Employee= require('../models/idCardSchema.js') 
const Invoice= require('../models/invoice.schema.js')
const logger= require('../services/logging.winston.js')
const OfferLetter= require('../models/offerLetterSchema.js')
const { S3Client }= require('../services/AWSs3Connection.js')
const Certificate = require('../models/certificateSchema.js')
const { getSignedUrl }= require('@aws-sdk/s3-request-presigner')
const { isOnlyLetters }= require('../services/validationFunctions.js')
const { handleMongodbConnection }= require('../services/connection.js')
const { sendEmailWithAttachment }= require('../services/emailService.js')
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3")
const { formatSalaryDetails, convertToDDMMYYYY, addWithLeadingZeros, convertToMongoDate, formatMongoDatetoNormalDate }= require('../services/miscellaneousServices.js')




exports.handlePostCertificateGeneration= async(req, res)=>{
    try{
        const username= req.user.username
        const { NAME, VIRTUE }= req.body;
            if(!NAME || !VIRTUE){
                return res.status(400).json({ success: false, message: "Provide all the required input fields."})
            }
  
        const certificate_id= `Dakshi-`+crypto.randomBytes(4).toString('hex')
        const URL= `${process.env.Domain}/certificates/${certificate_id}`
        
        const qrCodeData = await QRCode.toDataURL(URL)

        const docxTemplatePath= path.join(__dirname, '..', 'templates', 'DkashiFoundationCertificate_for_Windows.docx')
        const content= fs.readFileSync(docxTemplatePath, 'binary')
        const zip= new Pizzip(content)
        const doc= new Docxtemplater( zip, { paragraphLoop: true, linebreaks: true })
        
        doc.render( { NAME, VIRTUE })
        
        const timestamp= Date.now()
        const temporaryDocxPath = path.join(__dirname, `${NAME}-certi-of-${VIRTUE}-${timestamp}.docx`);
        const temporaryPdfPath = path.join(__dirname, `${NAME}-certi-of-${VIRTUE}-${timestamp}.pdf`);
        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        fs.writeFileSync(temporaryDocxPath, buf);

        const command= `soffice --headless --convert-to pdf "${temporaryDocxPath}"  --outdir "${__dirname}"` ;
        const execAsync= util.promisify(exec)
        
        const { stdout, stderr}= await execAsync(command) 
             if(stderr){
                 console.error('Error in command output:', stderr)
                 logger.apiControllerLogger.error("Error in certificate generator command output.")
                 return res.status(500).json({ success: false, messege: 'Error converting to PDF'})
             }
        console.log('Docs to PDF Conversion successful (Certificate)')
        logger.apiControllerLogger.info("Docs to PDF Conversion successful (Certificate)")

        const pdfBuffer = fs.readFileSync(temporaryPdfPath)
        const pdfDoc = await PDFDocument.load(pdfBuffer)

        const qrCodeBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64')
        const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer)

        const pages = pdfDoc.getPages()
        const firstPage = pages[0]
        firstPage.drawImage(qrCodeImage, {
            x: 108, y: 45,         
            width: 80, height: 60, 
        })

        const modifiedPdfBytes = await pdfDoc.save();
        const modifiedPdfPath = path.join(__dirname, `cert-${certificate_id}.pdf`)
        fs.writeFileSync(modifiedPdfPath, modifiedPdfBytes)

        const fileKey= `Certificates/${certificate_id}.pdf`
        const BUCKET_NAME= process.env.AWS_Bucket
        const AWS_REGION= process.env.AWS_Region

        const uploadParams= {
            Bucket : BUCKET_NAME,
            Key: fileKey,
            Body: modifiedPdfBytes,
            ContentType: "application/pdf",
        }
         
        try {
            const commandToUpload = new PutObjectCommand(uploadParams)
            const response = await S3Client.send(commandToUpload)
            console.log("Certificate uploaded successfully on S3 Bucket.")
            logger.apiControllerLogger.info("Certificate uploaded successfully on S3 Bucket.")

        } catch (err) {
            console.error("Error uploading file to S3:", err.message)
            logger.apiControllerLogger.error("Error uploading file to S3: "+ err.message)
            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath)
            fs.unlinkSync(modifiedPdfPath)
            throw new Error("Failed to upload file to S3. Please try again.")
        }

        const fileUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`
       
        try{
            const result= await Certificate.create({
                certificate_id: certificate_id,
                name: NAME,
                issue_date: Date.now(),
                certificate_url: fileUrl,
                issued_by: username
            })
            console.log("Certificate data Stored in DataBase.")
            logger.apiControllerLogger.info("Certificate data Stored in DataBase.")

        }catch(err){
            console.log("Error in Data Saving to Database in Certification Generation: ", err.message)
            logger.apiControllerLogger.error("Error in Data Saving to Database in Certification Generation: "+ err.message)
            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath)
            fs.unlinkSync(modifiedPdfPath)
            if (err.code === 11000) {
                return res.status(409).json({ success: false, error: 'Duplicate key error', message: `A record with the same ${Object.keys(err.keyPattern)} already exists.`})
            }
            throw err
        }

        res.status(200).json({ success: true, message: "Request Successfull.", redirect_url: fileUrl }) 
        fs.unlinkSync(temporaryDocxPath)
        fs.unlinkSync(temporaryPdfPath)
        fs.unlinkSync(modifiedPdfPath)

    }catch(err){
        console.error("Error in the certificate genarator API: ", err.message)
        logger.apiControllerLogger.error("Error in the certificate genarator API: ", + err.message)
        return res.status(500).json({ success: false, message: 'Internal Server Error'})
    }
}



exports.handlePostOfferLetterGeneration= async (req, res)=>{
    try{
        const username= req.user.username
        const { NAME, RP, LOCATION, DESIGNATION, SALARY_IW }= req.body
        let { DATE, JOINING_DATE, SALARY }= req.body
        
        const numSALARY= Number(SALARY)
        
        const JOIN_DATE= await convertToDDMMYYYY(JOINING_DATE)
        const C_DATE= await convertToDDMMYYYY(DATE)
        
        SALARY = Number(SALARY).toLocaleString("en-IN")
        
        await formatSalaryDetails(req.salaryDetails)
        let { BASIC, HRA, SA, GS, GRATUITY, PF, RB, CTC, IP }= req.salaryDetails

        await formatSalaryDetails(req.salaryDetailsPA)
        let { BASICpa, HRApa, SApa, GSpa, GRATUITYpa, PFpa, RBpa, CTCpa, IPpa }= req.salaryDetailsPA

        const offerLetter_id= `DF-`+crypto.randomBytes(6).toString('hex')
    
        const docxTemplatePath= path.join(__dirname, '..', 'templates', 'Offer_Letter.docx')
        const content= fs.readFileSync(docxTemplatePath, 'binary')
        const zip= new Pizzip(content)
        const doc= new Docxtemplater( zip, { paragraphLoop: true, linebreaks: true }) 

        doc.render( { NAME, RP, LOCATION, C_DATE, DESIGNATION, JOIN_DATE, SALARY, SALARY_IW, BASIC, HRA, SA, GS, GRATUITY, PF, RB, CTC, IP,BASICpa, HRApa, SApa, GSpa, GRATUITYpa, PFpa, RBpa, CTCpa, IPpa })

        const temporaryDocxPath = path.join(__dirname, `offerLetter-${offerLetter_id}.docx`)
        const temporaryPdfPath = path.join(__dirname, `offerLetter-${offerLetter_id}.pdf`)
        const buf = doc.getZip().generate({ type: 'nodebuffer' })
        fs.writeFileSync(temporaryDocxPath, buf)

        const command= `soffice --headless --convert-to pdf "${temporaryDocxPath}" --outdir "${__dirname}"` ;
        const execAsync= util.promisify(exec)

        const { stdout, stderr}= await execAsync(command) 
             if(stderr){
                  console.log('Error in command output:', stderr)
                  logger.apiControllerLogger.error("Error in command output.")
                  return res.status(500).json({ success: false, message: 'Error converting to PDF'})
             }
             console.log('Docs to PDF Conversion successful.(Offer Letter)')
             logger.apiControllerLogger.info("Docs to PDF Conversion successful.(Offer Letter)") 
        
        const fileKey= `Offer-Letters/${offerLetter_id}.pdf`
        const BUCKET_NAME= process.env.AWS_Bucket
        const PdfFileBytes = fs.readFileSync(temporaryPdfPath);
        
        const uploadParams= {
            Bucket : BUCKET_NAME,
            Key: fileKey,
            Body: PdfFileBytes,
            ContentType: "application/pdf",
        }
        let presignedUrl
        try {
            const commandToUpload = new PutObjectCommand(uploadParams)
            const response = await S3Client.send(commandToUpload)
            console.log("Offer Letter File uploaded successfully on S3 Bucket")
            logger.apiControllerLogger.info("Offer Letter File uploaded successfully on S3 Bucket")

            presignedUrl = await getSignedUrl(S3Client, new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: fileKey,
            }), { expiresIn: 604800 })

        } catch (err) {
            console.error("Error uploading file to S3:", err.message);
            logger.apiControllerLogger.error("Error uploading file to S3."+ err.message)
            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath) 
            throw new Error("Failed to upload file to S3. Please try again.");
        }
    
        JOINING_DATE= await convertToMongoDate(JOINING_DATE)
        DATE= await convertToMongoDate(DATE)
        
        try{
            const result= await OfferLetter.create({
                offerLetterId: offerLetter_id,
                Name: NAME,
                jobTitle: DESIGNATION,
                joiningDate: JOINING_DATE,
                issueDate: DATE,
                salary: numSALARY,
                issued_by: username,
                offerLetterUrl: presignedUrl,
                uploadedAt: Date.now()
            })
            console.log("Offer Letter data Stored in DataBase.")
            logger.apiControllerLogger.info("Offer Letter data Stored in DataBase.")

        }catch(err){
            console.log("Error in Data Saving to Database in Certification Generation: ", err.message)
            logger.apiControllerLogger.error("Error in Data Saving to Database in Certification Generation: "+ err.message)

            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath)
        
            if (err.code === 11000) {
                return res.status(409).json({ success: false, error: 'Duplicate key error', message: `A record with the same ${Object.keys(err.keyPattern)} already exists.`})
            }
            throw err
        }
        
        fs.unlinkSync(temporaryDocxPath)
        fs.unlinkSync(temporaryPdfPath) 
        return res.status(200).json({ success: true, message: "Request Successfull.", redirect_url: presignedUrl })
        
    }catch(err){
        console.error("Error in the Offer Letter genarator API: ", err.message)
        logger.apiControllerLogger.error("Error in the Offer Letter genarator API. "+ err.message)
        return res.status(500).json({ success: false, message: 'Internal Server Error'})
    }
}


exports.handlePostIdCardGenerator= async(req,res)=>{
    try{
        const username= req.user.username
        const { NAME, POSITION, CONTACT, EMAIL, ADDRESS, FATHER, ADHAR, BLOOD } = req.body
        let { ECODE, DOB, DOJ, DOE}= req.body
        
        DateOB= await convertToDDMMYYYY(DOB)
        DateOJ= await convertToDDMMYYYY(DOJ)
        DateOE= await convertToDDMMYYYY(DOE)

        const totalCount = await Employee.countDocuments()
        const id= totalCount + 1
        
        ECODE= `DFIC-${await addWithLeadingZeros('0000', id)}`
         
        const imageFile = req.file
        const imagePath = path.join(__dirname, '..', 'uploads', imageFile.filename)

        const URL= `${process.env.Domain}/id-cards/${ECODE}`
        const qrCodeData = await QRCode.toDataURL(URL);

        const docxTemplatePath = path.join(__dirname, '..', 'templates', 'IdCard.docx')
        const content = fs.readFileSync(docxTemplatePath, 'binary')
        const zip = new Pizzip(content);

        const doc= new Docxtemplater( zip, { paragraphLoop: true, linebreaks: true })

        doc.render({  NAME, POSITION, CONTACT, EMAIL, ADDRESS, ECODE, FATHER, DateOB, DateOJ, DateOE, ADHAR, BLOOD })

        const timestamp = Date.now();
        const temporaryDocxPath = path.join(__dirname, `temp-certi.docx`)
        const temporaryPdfPath = path.join(__dirname, `temp-certi.pdf`)
        const buf = doc.getZip().generate({ type: 'nodebuffer' })
        fs.writeFileSync(temporaryDocxPath, buf);

        const command = `soffice --headless --convert-to pdf "${temporaryDocxPath}" --outdir "${__dirname}"`;
        const execAsync = util.promisify(exec)

        const { stdout, stderr } = await execAsync(command)
        if (stderr) {
            console.log('Error in command output:', stderr)
            logger.apiControllerLogger.error("Error in command output."+ stderr)
            return res.status(500).json({ success: false, message : 'Error converting to PDF' })
        }
        console.log('Id card Docs to PDF Conversion successful')
        logger.apiControllerLogger.info('Docs to PDF Conversion successful')

        console.log(temporaryPdfPath)
        const pdfBuffer = fs.readFileSync(temporaryPdfPath)
        const pdfDoc = await PDFDocument.load(pdfBuffer)
        
        const imageBuffer = fs.readFileSync(imagePath)
        
        const imageExtension = path.extname(imageFile.originalname).toLowerCase()

        let embeddedImage;
        if (imageExtension === '.jpg' || imageExtension === '.jpeg') {
            embeddedImage = await pdfDoc.embedJpg(imageBuffer)
        } else if (imageExtension === '.png') {
            embeddedImage = await pdfDoc.embedPng(imageBuffer)
        } else {
            return res.status(400).json({ success: false, message: 'Unsupported image format. Only JPG and PNG are allowed.' });
        }
          
         const pages = pdfDoc.getPages()
         const qrCodeBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64')
         const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer)
         const firstPage = pages[0]

         firstPage.drawImage(embeddedImage, {
             x: 39.2, y: 127.5, 
             width: 60, height: 69, 
         })

         firstPage.drawImage(qrCodeImage, {
            x: 50, y: 20,          
            width: 35, height: 35, 
        })

        firstPage.drawRectangle({
            x: 39, y: 127.7,
            width: 60.2, height: 69.2,
            borderColor: rgb(0, 0, 0), 
            borderWidth: 0.85,
        })

        firstPage.drawRectangle({
            x: 52, y: 22,
            width: 31, height: 31,
            borderColor: rgb(0, 0, 0), 
            borderWidth: 0.85,
        })

        const modifiedPdfBytes = await pdfDoc.save();
        const modifiedPdfPath = path.join(__dirname, `Id-Cards-${ECODE}.pdf`);
        fs.writeFileSync(modifiedPdfPath, modifiedPdfBytes)

        const fileKey= `Id-Cards/${ECODE}.pdf`
        const BUCKET_NAME= process.env.AWS_Bucket
        const AWS_REGION= process.env.AWS_Region

        const uploadParams= {
            Bucket : BUCKET_NAME,
            Key: fileKey,
            Body: modifiedPdfBytes,
            ContentType: "application/pdf",
        }
         
        try {
            const commandToUpload = new PutObjectCommand(uploadParams)
            const response = await S3Client.send(commandToUpload)
            console.log("Id card uploaded successfully on S3 Bucket.")
            logger.apiControllerLogger.info("Id Card uploaded successfully on S3 Bucket.")

        } catch (err) {
            console.error("Error uploading file to S3:", err.message)
            logger.apiControllerLogger.error("Error uploading file to S3: "+ err.message)
            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath)
            fs.unlinkSync(modifiedPdfPath)
            throw new Error("Failed to upload file to S3. Please try again.")
        }

        const fileUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`

        try{
            DOB= await convertToMongoDate(DOB)
            DOJ= await convertToMongoDate(DOJ)
            DOE= await convertToMongoDate(DOE)

            const result= await Employee.create({
                NAME: NAME,
                POSITION: POSITION,
                CONTACT: CONTACT,
                EMAIL: EMAIL,
                ADDRESS: ADDRESS,
                ECODE: ECODE, 
                FATHER: FATHER,
                DateOB: DOB,
                DateOJ: DOJ,
                DateOE: DOE,
                ADHAR: ADHAR,
                BLOOD: BLOOD,
                issued_by: username,
                Id_url: fileUrl
            })
            console.log("ID Card Data Stored in DataBase.")
            logger.apiControllerLogger.info("ID Card Data Stored in DataBase.")
            
        }catch(err){
            console.log("Error in Data Saving to Database in Id Card Generation API: ", err.message)
            logger.apiControllerLogger.error("Error in Data Saving to Database in Id Card Generation API: "+ err.message)
            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath)
            fs.unlinkSync(modifiedPdfPath)
            if (err.code === 11000) {
                return res.status(409).json({ success: false, error: 'Duplicate key error', message: `A record with the same ${Object.keys(err.keyPattern)} already exists.`})
            }
            throw err
        }
        
        res.status(200).json({ success: true, message: "Request Successfull.", redirect_url: fileUrl })    
        fs.unlinkSync(temporaryDocxPath)
        fs.unlinkSync(temporaryPdfPath)
        fs.unlinkSync(modifiedPdfPath)
        
    }catch(err){
        console.error("Error in the Id Card genarator API: ", err.message)
        logger.apiControllerLogger.error("Error in the Id Card genarator API." + err.message)
        return res.status(500).json({ success: false, message : 'Internal Server Error'})
    } 
}



exports.handlePostInvoiceGeneration= async(req, res)=>{
    try{
        let { ADVANCE_DEPOSITE, MOBILE, INVOICE_DATE, DUE_DATE, COM_NAME, GSTIN, PHONE, EMAIL, BILLING_ADD, ITEM_1, ITEM_2, ITEM_3, ITEM_4, ITEM_1_RATE, ITEM_2_RATE, ITEM_3_RATE, ITEM_4_RATE, ITEM_1_QTY,ITEM_2_QTY,ITEM_3_QTY,ITEM_4_QTY } = req.body
        if (!ADVANCE_DEPOSITE || !MOBILE || !INVOICE_DATE || !DUE_DATE || !COM_NAME || !GSTIN || !PHONE || !EMAIL || !BILLING_ADD) {
            return res.status(400).json({ success: false, message: "Provide all the required input fields." });
        }

        if(!ITEM_1 || !ITEM_1_QTY || ITEM_1_QTY== "undefined"){ ITEM_1= "-", ITEM_1_QTY= 0, ITEM_1_RATE= 0}
        if(!ITEM_2 || !ITEM_2_QTY || ITEM_2_QTY== "undefined"){ ITEM_2= "-", ITEM_2_QTY= 0, ITEM_2_RATE= 0}
        if(!ITEM_3 || !ITEM_3_QTY || ITEM_3_QTY== "undefined"){ ITEM_3= "-", ITEM_3_QTY= 0, ITEM_3_RATE= 0}
        if(!ITEM_4 || !ITEM_4_QTY || ITEM_4_QTY== "undefined"){ ITEM_4= "-", ITEM_4_QTY= 0, ITEM_4_RATE= 0}

        function generateHexId(length = 8) {
            const bytes = Math.ceil(length / 2)
            return crypto.randomBytes(bytes).toString('hex').toUpperCase().slice(0, length)
        }

        const invoice_id= `Dakshi-`+`${generateHexId(8)}`
        const URL= `${process.env.Domain}/invoices/${invoice_id}`

        let INVOICE_ID= invoice_id
        const qrCodeData = await QRCode.toDataURL(URL)

        const docxTemplatePath= path.join(__dirname, '..', 'templates', 'Invoice_DFIC.docx')
        const content= fs.readFileSync(docxTemplatePath, 'binary')
        const zip= new Pizzip(content)
        const doc= new Docxtemplater( zip, { paragraphLoop: true, linebreaks: true })

        ITEM_1_TOTAL= ITEM_1_RATE*ITEM_1_QTY + (ITEM_1_RATE*ITEM_1_QTY *18/100) 
        ITEM_2_TOTAL= ITEM_2_RATE*ITEM_2_QTY + (ITEM_2_RATE*ITEM_2_QTY *18/100)
        ITEM_3_TOTAL= ITEM_3_RATE*ITEM_3_QTY + (ITEM_3_RATE*ITEM_3_QTY *18/100)
        ITEM_4_TOTAL= ITEM_4_RATE*ITEM_4_QTY + (ITEM_4_RATE*ITEM_4_QTY *18/100)

        let ITEM_1_GST= ITEM_1_RATE*ITEM_1_QTY *18/100
        let ITEM_2_GST= ITEM_2_RATE*ITEM_2_QTY *18/100
        let ITEM_3_GST= ITEM_3_RATE*ITEM_3_QTY *18/100
        let ITEM_4_GST= ITEM_4_RATE*ITEM_4_QTY *18/100

        let TOTAL_QTY= ITEM_1_QTY+ ITEM_2_QTY+ ITEM_3_QTY+ ITEM_4_QTY
        let TOTAL_GST= ITEM_1_GST+ ITEM_2_GST+ ITEM_3_GST+ ITEM_4_GST
        let TOTAL_AMOUNT= ITEM_1_TOTAL+ ITEM_2_TOTAL+ ITEM_3_TOTAL + ITEM_4_TOTAL

        REMAINING_AMOUNT= TOTAL_AMOUNT- ADVANCE_DEPOSITE
        
        doc.render( {  ADVANCE_DEPOSITE, REMAINING_AMOUNT, MOBILE, INVOICE_ID, INVOICE_DATE, DUE_DATE, COM_NAME, GSTIN, PHONE, EMAIL, BILLING_ADD,  ITEM_1, ITEM_2, ITEM_3, ITEM_4, ITEM_1_RATE, ITEM_2_RATE, ITEM_3_RATE, ITEM_4_RATE, ITEM_1_QTY,ITEM_2_QTY,ITEM_3_QTY,ITEM_4_QTY,
                       ITEM_1_TOTAL, ITEM_2_TOTAL, ITEM_3_TOTAL, ITEM_4_TOTAL, ITEM_1_GST, ITEM_2_GST, ITEM_3_GST, ITEM_4_GST, TOTAL_QTY, TOTAL_GST, TOTAL_AMOUNT
         })
        
        const timestamp= Date.now()
        const temporaryDocxPath = path.join(__dirname, `${invoice_id}-${timestamp}.docx`)
        const temporaryPdfPath = path.join(__dirname, `${invoice_id}-${timestamp}.pdf`)
        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        fs.writeFileSync(temporaryDocxPath, buf)

        const command= `soffice --headless --convert-to pdf "${temporaryDocxPath}"  --outdir "${__dirname}"` ;
        const execAsync= util.promisify(exec)
        
        const { stdout, stderr}= await execAsync(command) 
             if(stderr){
                 console.error('Error in command output:', stderr)
                 logger.apiControllerLogger.error("Error in certificate generator command output.")
                 return res.status(500).json({ success: false, messege: 'Error converting to PDF'})
             }
        console.log('Docs to PDF Conversion successful (Invoice)')
        logger.apiControllerLogger.info("Docs to PDF Conversion successful (Invoice)")

        const pdfBuffer = fs.readFileSync(temporaryPdfPath)
        const pdfDoc = await PDFDocument.load(pdfBuffer)

        const qrCodeBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64')
        const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer)

        const pages = pdfDoc.getPages()
        const firstPage = pages[0]
        firstPage.drawImage(qrCodeImage, {
            x: 478.5, y: 738,         
            width: 80, height: 60, 
        })

        const modifiedPdfBytes = await pdfDoc.save();
        const modifiedPdfPath = path.join(__dirname, `cert-${invoice_id}.pdf`)
        fs.writeFileSync(modifiedPdfPath, modifiedPdfBytes)

        const fileKey= `Invoice/${invoice_id}.pdf`
        const BUCKET_NAME= process.env.AWS_Bucket
        const AWS_REGION= process.env.AWS_Region

        const uploadParams= {
            Bucket : BUCKET_NAME,
            Key: fileKey,
            Body: modifiedPdfBytes,
            ContentType: "application/pdf",
        }
         
        try {
            const commandToUpload = new PutObjectCommand(uploadParams)
            const response = await S3Client.send(commandToUpload)
            console.log("Invoice uploaded successfully on S3 Bucket.")
            logger.apiControllerLogger.info("Invoice uploaded successfully on S3 Bucket.")

        } catch (err) {
            console.error("Error uploading file to S3:", err.message)
            logger.apiControllerLogger.error("Error uploading file to S3: "+ err.message)
            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath)
            fs.unlinkSync(modifiedPdfPath)
            throw new Error("Failed to upload file to S3. Please try again.")
        }

        const fileUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`
       
        try{
            const result= await Invoice.create({
                INC_ID: invoice_id,
                AMOUNT : TOTAL_AMOUNT, 
                AMOUNT_IW: TOTAL_AMOUNT,
                ADVANCE_DEPOSITE,
                REMAINING_AMOUNT,
                MOBILE,
                INVOICE_ID,
                INVOICE_DATE,
                DUE_DATE,
                COM_NAME,
                GSTIN,
                PHONE,
                EMAIL,
                BILLING_ADD,
                INVOICE_URL : fileUrl
            })

            if(!result){
                throw err
            }
            console.log("Invoice data Stored in DataBase.")
            logger.apiControllerLogger.info("Invoice data Stored in DataBase.")

        }catch(err){
            console.log("Error in Data Saving to Database in Invoice Generation: ", err.message)
            logger.apiControllerLogger.error("Error in Data Saving to Database in Invoice Generation: "+ err.message)
            fs.unlinkSync(temporaryDocxPath)
            fs.unlinkSync(temporaryPdfPath)
            fs.unlinkSync(modifiedPdfPath)
            if (err.code === 11000) {
                return res.status(409).json({ success: false, error: 'Duplicate key error', message: `A record with the same ${Object.keys(err.keyPattern)} already exists.`})
            }
            throw err
        }

        res.status(200).json({ success: true, message: "Request Successfull.", redirect_url: fileUrl }) 
        fs.unlinkSync(temporaryDocxPath)
        fs.unlinkSync(temporaryPdfPath)
        fs.unlinkSync(modifiedPdfPath)

    }catch(err){
        console.error("Error in the Invoice genarator API: ", err.message)
        logger.apiControllerLogger.error("Error in the certificate genarator API: ", + err.message)
        return res.status(500).json({ success: false, message: 'Internal Server Error'})
    }
}



exports.PdfEmailCronJob = async () => {
    try {
        cron.schedule("*/5 * * * *", async()=>{
        const {db , client } = await handleMongodbConnection()
        
        if (!db || !client ) {  
            throw new Error("Database connection failed")
        }

        const collection = db.collection("payments")
        const data = await collection.findOne({ emailSent: false })
        if(!data){
            await client.close()
            console.log("Database connection closed.")
            return
        }
        
        console.log(`Cron-job for Email sending runs. at ${Date.now()}`)
        logger.apiControllerLogger.info("Cron-job for Email sending runs. at ${Date.now()}")

        const PdfGenerator = async () => {      
            if (!data.emailSent) {
                try {
                    const URL=`https://admin.dakshifoundation.in/donation/${data.certificateId}`
                    const qrCodeData = await QRCode.toDataURL(URL)
                    let { name: NAME, address: ADDRESS, createdAt: DATE, modeOfDonation: PMODE, donation: AMMOUNT, toward: PURPOSE, payment_id: RECEIPT } = data
                    DATE= await formatMongoDatetoNormalDate(DATE)
                            
                    const docxTemplatePath = path.join(__dirname, '..', 'templates', 'Donationcertificate.docx')
                    const content = fs.readFileSync(docxTemplatePath, 'binary')
                    const zip = new Pizzip(content)
                    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

                    doc.render({ NAME, ADDRESS, DATE, RECEIPT, PURPOSE, PMODE, AMMOUNT })

                    const timestamp = Date.now()
                    const temporaryDocxPath = path.join(__dirname, `${NAME}-certi-of-Donation-${timestamp}.docx`)
                    const temporaryPdfPath = path.join(__dirname, `${NAME}-certi-of-Donation-${timestamp}.pdf`)

                    const buf = doc.getZip().generate({ type: 'nodebuffer' })
                    fs.writeFileSync(temporaryDocxPath, buf)

                    const command = `soffice --headless --convert-to pdf "${temporaryDocxPath}"  --outdir "${__dirname}"`
                    const execAsync = util.promisify(exec)

                    try {
                        const { stdout, stderr } = await execAsync(command)
                        if (stderr) {
                            console.error('Error in command output:', stderr)
                            fs.unlinkSync(temporaryDocxPath)
                            logger.apiControllerLogger.error("Error in certificate generator command output.")
                            return;
                        }
                        logger.apiControllerLogger.info("Docs to PDF Conversion successful (Donation Certificate)")

                    } catch (err) {
                        console.error("Error in PDF conversion:", err)
                        fs.unlinkSync(temporaryDocxPath)
                        throw err
                    }

                    const pdfBuffer = fs.readFileSync(temporaryPdfPath)
                    const pdfDoc = await PDFDocument.load(pdfBuffer)

                    const qrCodeBuffer = Buffer.from(qrCodeData.split(',')[1], 'base64')
                    const qrCodeImage = await pdfDoc.embedPng(qrCodeBuffer)

                    const pages = pdfDoc.getPages()
                    const firstPage = pages[0]
                    firstPage.drawImage(qrCodeImage, {
                        x: 490, y: 200,
                        width: 80, height: 60,
                    })

                    const modifiedPdfBytes = await pdfDoc.save()
                    const modifiedPdfPath = path.join(__dirname, `cert-${data.certificateId}.pdf`)
                    fs.writeFileSync(modifiedPdfPath, modifiedPdfBytes)
                    
                    const fileKey= `donation/${data.certificateId}.pdf`
                    const BUCKET_NAME= process.env.AWS_Bucket
                    const AWS_REGION= process.env.AWS_Region

                    const uploadParams= {
                        Bucket : BUCKET_NAME,
                        Key: fileKey,
                        Body: modifiedPdfBytes,
                        ContentType: "application/pdf",
                    }
                    
                    try {
                        const commandToUpload = new PutObjectCommand(uploadParams)
                        const response = await S3Client.send(commandToUpload)
                        logger.apiControllerLogger.info("donation certificate uploaded successfully on S3 Bucket.")

                    } catch (err) {
                        console.error("Error uploading file to S3:", err.message)
                        logger.apiControllerLogger.error("Error uploading file to S3: "+ err.message)
                        fs.unlinkSync(temporaryDocxPath)
                        fs.unlinkSync(temporaryPdfPath)
                        fs.unlinkSync(modifiedPdfPath)
                        throw new Error("Failed to upload file to S3. Please try again.")
                    }

                    try{
                        const email= data.email
                        const BufferForEmail= fs.readFileSync(modifiedPdfPath)
                        await sendEmailWithAttachment(email, BufferForEmail, NAME)
                        
                        await collection.updateOne(
                            { _id: data._id },
                            { $set: { emailSent: true } } 
                        )
                        
                        fs.unlinkSync(temporaryDocxPath)
                        fs.unlinkSync(temporaryPdfPath)
                        fs.unlinkSync(modifiedPdfPath)

                        console.log("Email with Donation certificate sent successfully.")
                        logger.apiControllerLogger.info("Email with Donation certificate sent successfully.")

                    }catch(err){
                        fs.unlinkSync(temporaryDocxPath)
                        fs.unlinkSync(temporaryPdfPath)
                        fs.unlinkSync(modifiedPdfPath)
                        logger.apiControllerLogger.error("Error in sending email."+ err.message)
                        console.error("Error in sending email."+ err.message)
                        throw err
                    }

                } catch (err) {
                    console.error("Error generating PDF:", err.message)
                    logger.apiControllerLogger.error("Error generating PDF:", err.message)
                    throw err
                } finally {
                    if(client){
                        await client.close()
                    }
                }
            }
        }
         await PdfGenerator()
        })

    } catch (err) {
        console.error("Error in email sending cronJob:", err.message)
        logger.apiControllerLogger.error("Error generating PDF:", err.message)

    }
}


// sendGrid APIs : SG.3RnHTplvR7ic_g8b8NwSLg.IfEVvAThgKhBin0LqZl5nwvmdmrBg2sQ