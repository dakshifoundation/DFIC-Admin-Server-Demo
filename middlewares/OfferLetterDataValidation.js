const { body, validationResult } = require("express-validator")
const xss = require("xss")



const validateOfferLetter = [

    body("NAME")
        .trim()
        .notEmpty().withMessage("Name is required")
        .isLength({ max: 100 }).withMessage("Name must be under 100 characters")
        .customSanitizer(value => xss(value)),

    body("DESIGNATION")
        .trim()
        .notEmpty().withMessage("Job Title is required")
        .isLength({ max: 50 }).withMessage("Job Title must be under 50 characters")
        .customSanitizer(value => xss(value)),

    body("JOINING_DATE")
        .notEmpty().withMessage("Joining Date is required"),

    body("DATE")
        .notEmpty().withMessage("Joining Date is required"),

    body("SALARY")
        .notEmpty().withMessage("Salary is required")
        .isNumeric().withMessage("Salary must be a valid number")
        .customSanitizer(value => xss(value)),

    body("LOCATION")
        .trim()
        .notEmpty().withMessage("Location is required")
        .isLength({ max: 100 }).withMessage("Location must be under 100 characters")
        .customSanitizer(value => xss(value)),

    body("RP")
        .trim()
        .notEmpty().withMessage("RP is required")
        .isLength({ max: 30 }).withMessage("RP must be under 30 characters")
        .custom(value => {
            if (value <= 0) {
                throw new Error("Salary must be a positive number")
            }
            return true
        })
        .customSanitizer(value => xss(value)),

    body("SALARY_IW")
        .trim()
        .notEmpty().withMessage("Salary IW is required")
        .isLength({ max: 100 }).withMessage("Salary IW must be under 100 characters")
        .customSanitizer(value => xss(value)),

    (req, res, next) => {
        const errors = validationResult(req)  
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() })
        }
        next()
    }
]

module.exports = validateOfferLetter;
