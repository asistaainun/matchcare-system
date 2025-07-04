const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');
const { body } = require('express-validator');

// Public route for getting questions
router.get('/questions', quizController.getQuestions);

// Protected routes
router.post('/submit', [
  auth,
  body('responses').isObject().notEmpty()
], quizController.submitQuiz);

router.get('/history', auth, quizController.getQuizHistory);

module.exports = router;