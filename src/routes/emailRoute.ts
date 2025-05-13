import { Router } from 'express';
import multer from 'multer';
import { uploadCSV, getUploadStatus } from '../controllers/emailController';
const router = Router()
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), uploadCSV);

router.get('/status/:uploadID', getUploadStatus);

export default router;
