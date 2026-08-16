const express = require('express');
const router = express.Router();
const { startTest, getSession, submitAnswer } = require('../controllers/testController');
const { completeTest } = require('../controllers/resultController');
const { optionalAuth } = require('../middleware/auth');

router.post('/start', optionalAuth, startTest);
router.get('/:sessionId', optionalAuth, getSession);
router.post('/:sessionId/answer', optionalAuth, submitAnswer);
router.post('/:sessionId/complete', optionalAuth, completeTest);

module.exports = router;
