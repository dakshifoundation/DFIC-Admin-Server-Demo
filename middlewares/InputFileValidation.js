const path = require("path");

exports.validateImageUpload = async (req, res, next) => {
    try {
    
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file uploaded." })
        }

        const imageFile = req.file
        const fileName = imageFile.originalname
        const fileSize = imageFile.size
        const imageExtension = path.extname(fileName).toLowerCase()
        const allowedExtensions = [".jpg", ".jpeg", ".png"]
        const maxFileSize = 5 * 1024 * 1024

        if (!allowedExtensions.includes(imageExtension)) {
            return res.status(400).json({ success: false, message: "Unsupported image format. Only JPG and PNG are allowed." })
        }

        if (fileSize > maxFileSize) {
            return res.status(400).json({ success: false, message: "File size exceeds 5MB limit." })
        }

        req.file.sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
        
        next()
        
    } catch (err) {
        console.error("Error in the InputeFileValidation Middleware: "+ err.message)
        return res.status(500).json({ success: false, message: "Internal server error." })
    }
}


