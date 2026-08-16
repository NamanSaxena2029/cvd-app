const express = require('express');
const router = express.Router();
const {
  getDashboard,
  listImages,
  createImage,
  updateImage,
  deleteImage,
  uploadImageFile,
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getDashboard);

router.get('/images', listImages);
router.post('/images', createImage);
router.put('/images/:id', updateImage);
router.delete('/images/:id', deleteImage);
router.post('/images/upload', upload.single('image'), uploadImageFile);

module.exports = router;
