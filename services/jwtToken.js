const jwt= require('jsonwebtoken')
const logger= require('../services/logging.winston.js')


exports.createJwtToken= async (username,id,secret)=>{
  try{
      return jwt.sign({username,id},secret,{expiresIn: '3h'})
  }catch(err){
    console.error(`Error In creating Token.`,err.message)
    logger.servicesLogger.error("Error In creating Token. "+ err.message)
    throw err
  }
}


exports.verifyToken= async (token,secret)=>{
  try{
      return jwt.verify(token,secret)
  }catch(err){
    console.error(`Error In varifying Token.`,err.message)
    logger.servicesLogger.error("Error In verifying Token. "+ err.message)
    throw err
  }
}


exports.decodeToken= async (token)=>{
  try{
      return jwt.decode(token)
  }catch(err){
    console.error(`Error In Decoding Token.`,err.message)
    logger.servicesLogger.error("Error In Decoding Token. "+ err.message)
    throw err
  }
}