const rateLimiter= require('express-rate-limit')


const loginPostRequestLimiter=  rateLimiter({
    windowMs: 5 * 60 * 1000,
    max : 20,
    message: { message : 'Too many login attempts from this Device.Please try again later.'},
    standardHeaders: true, 
    legacyHeaders: false,  
})


const allRequestsRateLimiter=  rateLimiter({
    windowMs: 1 * 60 * 1000, 
    max: 100,
    message: { message : 'Too many requests.Please try after some time.' },
    standardHeaders: true,
    legacyHeaders : false
})


module.exports= { loginPostRequestLimiter, allRequestsRateLimiter }