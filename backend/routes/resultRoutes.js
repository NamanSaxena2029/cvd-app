const express = require('express');
const router = express.Router();
const {
  getResult,
  getHistory,
  downloadReport,
  getSharedResult,
} = require('../controllers/resultController');
const { optionalAuth, requireAuth } = require('../middleware/auth');

router.get('/history', requireAuth, getHistory);
router.get('/shared/:shareToken', getSharedResult);
router.get('/:id/report', optionalAuth, downloadReport);
router.get('/:id', optionalAuth, getResult);

module.exports = router;
