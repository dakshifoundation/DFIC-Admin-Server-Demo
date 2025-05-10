const { body } = require('express-validator');

const validateProfile = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required.')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters.'),

    body('jobTitle')
        .trim()
        .optional()
        .isLength({ min: 2, max: 100 }).withMessage('Job title must be between 2 and 100 characters.'),

    body('location')
        .trim()
        .optional()
        .isLength({ max: 150 }).withMessage('Location cannot exceed 150 characters.'),

    body('about')
        .trim()
        .optional()
        .isLength({ max: 500 }).withMessage('About section cannot exceed 500 characters.')
]

module.exports = validateProfile
