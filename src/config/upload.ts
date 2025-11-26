import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDirs = ['uploads/passports', 'uploads/certificates', 'uploads/letters', 'uploads/payroll'];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    // Determine folder based on field name
    if (file.fieldname === 'passport') {
      uploadPath += 'passports/';
    } else if (file.fieldname === 'certificate') {
      uploadPath += 'certificates/';
    } else if (file.fieldname === 'letter') {
      uploadPath += 'letters/';
    } else if (file.fieldname === 'payroll') {
      uploadPath += 'payroll/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: staffHash_timestamp_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}_${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedImageTypes = /jpeg|jpg|png/;
  const allowedDocTypes = /pdf|doc|docx/;
  const allowedCSVTypes = /csv/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  
  // Check based on field name
  if (file.fieldname === 'passport') {
    const isValidImage = allowedImageTypes.test(extname) && 
                         /image\/(jpeg|jpg|png)/.test(mimetype);
    if (isValidImage) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG) are allowed for passport photos'));
    }
  } else if (file.fieldname === 'certificate' || file.fieldname === 'letter') {
    const isValidDoc = allowedDocTypes.test(extname) && 
                       /(application\/pdf|application\/msword|application\/vnd.openxmlformats-officedocument.wordprocessingml.document)/.test(mimetype);
    if (isValidDoc) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF or Word documents are allowed'));
    }
  } else if (file.fieldname === 'payroll') {
    const isValidCSV = allowedCSVTypes.test(extname) && 
                       /text\/csv/.test(mimetype);
    if (isValidCSV) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed for payroll'));
    }
  } else {
    cb(null, true);
  }
};

// Multer upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper to delete file
export const deleteFile = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default upload;