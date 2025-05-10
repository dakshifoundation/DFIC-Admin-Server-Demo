const express= require('express')
const router= express.Router();
const path= require('path')
const multer= require('multer')
const Admin= require("../controllers/admin.js")
const PdfGenerator= require('../controllers/pdfGenerators.js')
const { CalculateSalary }= require('../middlewares/SalaryCalculation.js')
const { checkRequiredFields }= require('../middlewares/validator.js')
const InputValidationID= require('../middlewares/IdCardDataValidation.js')
const InputValidationOL= require('../middlewares/OfferLetterDataValidation.js')
const { validateImageUpload }= require('../middlewares/InputFileValidation.js')
const Functions= require('../controllers/func.controller.js')
const DataDelete= require('../controllers/dataDeletion.controller.js')


const upload= multer({ dest: path.join(__dirname, '..', 'uploads/') })
const storage = multer.memoryStorage()
const memory_upload = multer({ storage })



router.get("/home", Admin.handleGetAdminHomePage)

router.get("/get-profile", Admin.handleGetProfileInfo)

router.get("/logout", Admin.handleAdminLogout)

router.get("/get-all-internships-registrations", Functions.handleGetInternshipData)

router.get("/get-all-contact-form", Functions.handleGetContactMessages)



router.get("/all-certificates", Functions.handleGetAllCertificatesData)

router.get("/all-idcards", Functions.handleGetAllIdCardData)

router.get("/all-invoices", Functions.handleGetAllInvoiceData)

router.get("/all-offerletters", Functions.handleGetAllOfferLetterData)



router.post("/update-pass", Admin.handleAdminPasswordChange)

router.post("/profile", upload.single('image'), Admin.handleAdminProfile)

router.post("/add-event", memory_upload.fields([ { name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, , { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }]), Functions.handlePostEvents)

router.post("/add-team-members", memory_upload.single('team_member_image'), Functions.handleAddTeamMembers)

router.post("/add-ngo-partners", memory_upload.fields([ { name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }]), Functions.handlePostPartners)

router.post("/add-program-images", memory_upload.single('program-image'), Functions.handlePostProgramImages )



router.post("/delete/team-member", DataDelete.handlePostDeleteTeamMember )

router.post("/delete/partner", DataDelete.handlePostDeletePartner)

router.post("/delete/event", DataDelete.handlePostDeleteEvent)

router.post("/delete/program-image", DataDelete.handlePostDeleteProgramImge)

router.post("/delete/internship-data", DataDelete.handlePostDeleteInternshipData)

router.post("/delete/contactus-data", DataDelete.handlePostDeleteContactUsData)



router.post("/generate/v1/invoice", PdfGenerator.handlePostInvoiceGeneration)

router.post("/generate/v1/certificate", PdfGenerator.handlePostCertificateGeneration)

router.post("/generate/v1/offer-letter", InputValidationOL, CalculateSalary, PdfGenerator.handlePostOfferLetterGeneration)

router.post("/generate/v1/id-card", upload.single('IMAGE'), InputValidationID, validateImageUpload, PdfGenerator.handlePostIdCardGenerator)



module.exports= router