const validator= require('validator')
const logger= require('../services/logging.winston.js')

exports.isOnlyLetters= async ( value )=>{
    try{
        return validator.isAlpha(value, 'en-US', { ignore : ' '})
    }catch(err){
        console.error("Error in Data validation function: ",err.message)
        logger.servicesLogger.error("Error in Data validation function: "+ err.message)
    }
}