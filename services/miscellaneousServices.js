const cron = require("node-cron")
const Employee= require('../models/idCardSchema')
const logger= require('../services/logging.winston.js')



exports.formatSalaryDetails= async (salaryDetails)=> {
    for (let key in salaryDetails) {
        if (typeof salaryDetails[key] === "number") {
            salaryDetails[key] = salaryDetails[key].toLocaleString("en-IN", { minimumFractionDigits: 2 });
        }
    }
}


exports.formatDateToDDMMYYYY = async (timestamp) => {
    try{
        const date = new Date(timestamp)
        const monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ]

        const day = date.getDate()
        const month = monthNames[date.getMonth()]
        const year = date.getFullYear()   
        return `${day} ${month} ${year}`

    }catch(err){
        console.error("Error in Date conversion function:"+ err.message)
        logger.servicesLogger.error("Error in Date conversion function:"+ err.message)
    }   
  }


exports.addWithLeadingZeros= async (num1, num2)=> {
    try{
        return await (parseInt(num1) + num2).toString().padStart(4, '0')
    }catch(err){
        consoel.error("Error in miscellaneous Function: "+ err.message)
        logger.servicesLogger.error("Error in miscellaneous Function: "+ err.message)
        
    }
}

exports.convertToTimestamp = async (dateString) => {
    try{
        const [day, month, year] = dateString.split("-").map(Number);
        return new Date(year, month - 1, day).getTime(); 
    }
    catch(err){
        console.error("Error in the convertToTimestamp miscellaneous function"+ err.message)
        logger.servicesLogger.error("Error in convertToTimestamp miscellaneous Function: "+ err.message)
    }
};


exports.cronJobs= async()=>{
    try{
        cron.schedule("0 0 * * *", async () => {    // checks for each day once at 00:00
            try {
                const currentDate = new Date()

                const result = await Employee.updateMany(
                    { DateOE: { $lte: currentDate }, isActive: true },
                    { $set: { isActive: false } }
                )

                if (result.modifiedCount > 0) {
                    console.log(`${result.modifiedCount} employee(s) deactivated.`)
                    logger.servicesLogger.info(`${result.modifiedCount} employee(s) deactivated.`)
                }

                console.log(`cron-job runs successfully today at ${Date.now()}`)
                logger.servicesLogger.info(`cron-job runs successfully today at ${Date.now()}`)
        
            } catch (err) {
                console.error("Error updating employee status:", err.message)
                logger.servicesLogger.error("Error updating employee status:"+ err.message)
            }
         })  
         console.log("cron-job started for ID-Cards Deactivation.")
     } catch(err){
        console.error("Error updating employee status:", err.message)
        logger.servicesLogger.error("Error updating employee status: "+ err.message)
     }
}



exports.formatMongoDatetoNormalDate =async  (mongoDate) => {
    try {
        const date = new Date(mongoDate)

        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = date.getFullYear();

        return `${day}-${month}-${year}`
    } catch (err) {
        console.error("Error in date conversion:", err.message)
        return null
    }
}



exports.PdfEmailCronJob= async()=>{
    try{
        cron.schedule("0 0 * * *", async()=>{
            
        })
    }catch(err){

    }
}






exports.convertToMongoDate= async (dateString) => {
    try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            throw new Error("Invalid date format. Expected format: YYYY-MM-DD");
        }

        const mongoDate = new Date(dateString);

        if (isNaN(mongoDate.getTime())) {
            throw new Error("Invalid date. Please check the input values.");
        }

        return mongoDate;

    } catch (error) {
        console.err("Error converting date:", err.message);
        logger.servicesLogger.error("Error converting date:"+ err.message)
        return null; 
    }
}


exports.convertToDDMMYYYY= async (dateString)=> {
    try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            throw new Error("Invalid date format. Expected format: YYYY-MM-DD")
        }

        const [year, month, day] = dateString.split('-')

        return `${day}-${month}-${year}`

    } catch (err) {
        console.error("Error converting date:", err.message)
        logger.servicesLogger.error("Error converting date:"+ err.message)
        return null
    }
}









  