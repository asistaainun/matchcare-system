const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { body } = require('express-validator');

// Public routes
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim()
], userController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], userController.login);

// Protected routes
router.use(auth); // Apply auth middleware to all routes below

router.get('/profile', userController.getProfile);

router.put('/profile', [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('preferences').optional().isObject()
], userController.updateProfile);

router.get('/favorites', userController.getFavorites);

router.post('/favorites', [
  body('productId').isUUID()
], userController.addToFavorites);

router.delete('/favorites/:productId', userController.removeFromFavorites);

module.exports = router;