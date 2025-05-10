const logger= require('../services/logging.winston.js')
const { verifyToken }= require('../services/jwtToken.js')
const secret= process.env.Secret


exports.CookieAuthentication= async (req, res, next)=>{
    try{
        const authHeader= req.headers['authorization']
        let token
        if( authHeader && authHeader.startsWith('Bearer ')){
            token= authHeader.slice(7)
        }
        const tokenBlacklist = req.app.locals.tokenBlacklist
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication token is missing.' });
        }
        
        if (token && tokenBlacklist[token]) {
            const currentTime = Date.now();
            const expirationTime = tokenBlacklist[token];

            if (currentTime < expirationTime) {
                return res.status(401).json({ success: false, message: 'Token is blacklisted.' });
            }
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

        req.user= user; 
        next();

    }catch(err){
        console.error("Error in the Token-authentication Middleware: "+ err.message);
        logger.middlewaresLogger.error("Error in the cookie-authentication API: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal Server Error." })
    }
}