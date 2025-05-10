const { body, validationResult } = require("express-validator");
const xss = require("xss");

const validateEmployeeInput = [
    body("NAME")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ max: 30 }).withMessage("Name must be under 30 characters")
        .customSanitizer(value => xss(value)), 

    body("POSITION")
        .trim()
        .notEmpty().withMessage("Position is required")
        .isLength({ max: 30 }).withMessage("Position must be under 30 characters")
        .customSanitizer(value => xss(value)),

    body("CONTACT")
        .trim()
        .matches(/^[0-9]{10}$/).withMessage("Contact must be a 10-digit number.No Country Code.")
        .customSanitizer(value => xss(value)),

    body("EMAIL")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email format")
        .normalizeEmail()
        .customSanitizer(value => xss(value)),

    body("ADDRESS")
        .trim()
        .notEmpty().withMessage("Address is required")
        .isLength({ max: 100 }).withMessage("Address must be under 100 characters")
        .customSanitizer(value => xss(value)),

    body("FATHER")
        .trim()
        .notEmpty().withMessage("Father's name is required")
        .isLength({ max: 20 }).withMessage("Father's name must be under 20 characters")
        .customSanitizer(value => xss(value)),

    body("DOB")
        .trim()
        .notEmpty().withMessage("Date of Birth is required"),

    body("DOJ")
        .trim()
        .notEmpty().withMessage("Date of Joining is required"),

    body("DOE")
        .trim()
        .notEmpty().withMessage("Date of Exit is required"),

    body("ADHAR")
        .trim()
        .notEmpty().withMessage("Aadhar number is required")
        .matches(/^[0-9]{12}$/).withMessage("Aadhar must be a 12-digit number")
        .customSanitizer(value => xss(value)),

    body("BLOOD")
        .trim()
        .notEmpty().withMessage("Blood group is required")
        .isIn(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).withMessage("Invalid blood group")
        .customSanitizer(value => xss(value)),

    (req, res, next) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: "Bad Request.", errors: errors.array() })
        }
        
        next()
    }
]


module.exports = validateEmployeeInput
