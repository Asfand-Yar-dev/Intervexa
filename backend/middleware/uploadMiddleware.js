/**
 * Upload Middleware
 * Secure file upload handling with Multer
 * 
 * SECURITY FIXES APPLIED:
 * 1. Explicit file extension whitelist (not just MIME type)
 * 2. Absolute path for upload directory
 * 3. Sanitized filename (no path traversal)
 * 4. Multer error handling middleware
 * 5. Recursive directory creation
 */

const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// SECURITY FIX: Use absolute path, not relative
const uploadDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// SECURITY: Explicit whitelist of allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
    '.mp3', '.wav', '.webm', '.ogg', '.m4a', '.aac', '.flac', // audio
    '.mp4', '.mkv', '.avi', '.mov', '.webm',                   // video
]);

// SECURITY: Allowed MIME type prefixes
const ALLOWED_MIME_PREFIXES = ['audio/', 'video/'];

/**
 * File storage configuration
 * SECURITY: Generate random filenames to prevent path traversal
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // SECURITY FIX: Generate cryptographically random filename
        // Do NOT use file.originalname for the path — it's user-controlled
        const randomName = crypto.randomBytes(16).toString('hex');
        const safeExt = path.extname(file.originalname).toLowerCase();

        // Double-check extension is safe
        if (!ALLOWED_EXTENSIONS.has(safeExt)) {
            return cb(new Error('Invalid file extension'), null);
        }

        cb(null, `${Date.now()}-${randomName}${safeExt}`);
    }
});

/**
 * File filter - validates both MIME type AND extension
 * SECURITY: Double validation prevents MIME spoofing attacks
 */
const fileFilter = (req, file, cb) => {
    // Check MIME type
    const isMimeValid = ALLOWED_MIME_PREFIXES.some(prefix =>
        file.mimetype.startsWith(prefix)
    );

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const isExtValid = ALLOWED_EXTENSIONS.has(ext);

    if (isMimeValid && isExtValid) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE',
            'Invalid file. Only audio and video files are allowed (.mp3, .wav, .webm, .mp4, etc.).'
        ), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
        files: 1, // Only one file per request
    }
});

/**
 * Multer error handling middleware
 * Must be used AFTER the upload middleware in the route chain
 * 
 * Usage: router.post('/upload', upload.single('audio'), handleMulterError, controller)
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        let message = 'File upload error';
        let statusCode = 400;

        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                message = `File too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024) / (1024 * 1024)}MB`;
                statusCode = 413;
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files. Only one file allowed per upload.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = err.message || 'Unexpected file field or invalid file type.';
                break;
            default:
                message = err.message;
        }

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed.',
        });
    }

    next();
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;
module.exports.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS;