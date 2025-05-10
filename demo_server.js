require('dotenv').config()
const cors = require('cors')
const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const userRoutes= require('./routes/user.routes.js')
const { cronJobs }= require('./services/miscellaneousServices.js')
const genaratorRoutes= require('./routes/pdfGenerate.routes.js')
const { handleDatabaseConnection, handleMongodbConnection }= require('./services/connection.js')
const { CookieAuthentication }= require('./middlewares/AuthMiddleware.js')
const { allRequestsRateLimiter }= require('./middlewares/RateLimiters.js')
const { PdfEmailCronJob }= require('./controllers/pdfGenerators.js')


const app = express()
const port = process.env.PORT || 3000


const tokenBlacklist= {}
app.locals.tokenBlacklist = tokenBlacklist            


async function connectMongoDB(){
    try{
        await handleDatabaseConnection()
        console.log("MongoDB Database connected.")
    }catch(err){
        console.error("Error in connecting MongoDB Database."+ err)
    }
}


async function connectMongoDBClient(){
    try{
        await handleMongodbConnection()
        console.log("Database Client Connected.")
    }catch(err){
        console.error("Error in connecting MongoDB Database."+ err)
    }
}
connectMongoDB()
connectMongoDBClient()


cronJobs()
PdfEmailCronJob()

app.use(cors({
    origin: 'http://192.168.60.94:5173',   
    credentials: true,                     
    methods: ["GET, POST, PUT, DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}))


// app.use(cors({
//     origin: '*',   
//     credentials: true,                     
//     methods: ["GET, POST, PUT, DELETE"],
//     allowedHeaders: ["Content-Type", "Authorization"]
// }))

app.use(cookieParser())
app.use(express.json())
app.set('trust proxy', 1)
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'Dakshi-Admin-Frontend/dist')))



app.use("/", allRequestsRateLimiter, userRoutes)
app.use("/admin", allRequestsRateLimiter, CookieAuthentication, genaratorRoutes)
// app.use("/admin", allRequestsRateLimiter, genaratorRoutes)                


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Dakshi-Admin-Frontend/dist', 'index.html'))
})


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})
