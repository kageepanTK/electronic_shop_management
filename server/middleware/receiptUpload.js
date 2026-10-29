const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const RECEIPT_DIR = path.join(__dirname, '..', 'private-uploads', 'receipts');
fs.mkdirSync(RECEIPT_DIR, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_MIME).map(([mime, ext]) => [ext, mime]));

const uploader = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, RECEIPT_DIR),
    // random name, and the extension comes from the checked type, never from the user's file name
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + EXT_BY_MIME[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXT_BY_MIME[file.mimetype]) return cb(null, true);
    cb(new Error('Receipt must be a JPG, PNG, WEBP or PDF file'));
  },
}).single('receipt');

// Returns clean JSON errors instead of crashing the request
const receiptUpload = (req, res, next) => {
  uploader(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Receipt must be 5 MB or smaller' : err.message || 'Upload failed';
      return res.status(400).json({ message });
    }
    next();
  });
};

module.exports = { receiptUpload, RECEIPT_DIR, TYPE_BY_EXT };