const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const { body, param } = require('express-validator');
const { createRateLimit } = require('../middleware/auth');

// Rate limiting for guest routes
const guestRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // max 100 requests per window
  'Too many guest requests, please try again later'
);

const quizRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour  
  5, // max 5 quiz submissions per hour
  'Too many quiz submissions, please try again later'
);

// Apply rate limiting to all guest routes
router.use(guestRateLimit);

// Create guest session
router.post('/session', guestController.createSession);

// Get guest session
router.get('/session/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID format')
], guestController.getSession);

// Submit guest quiz (with stricter rate limiting)
router.post('/quiz/:sessionId', [
  quizRateLimit,
  param('sessionId').isUUID().withMessage('Invalid session ID format'),
  body('responses').isObject().notEmpty().withMessage('Quiz responses are required'),
  body('responses.skin_type').optional().isString(),
  body('responses.skin_concerns').optional().isArray(),
  body('responses.sensitivities').optional().isArray(),
  body('responses.routine_complexity').optional().isIn(['minimal', 'moderate', 'extensive']),
  body('responses.budget_range').optional().isString()
], guestController.submitQuiz);

// Update guest preferences
router.put('/preferences/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID format'),
  body('avoidedIngredients').optional().isArray(),
  body('preferredIngredients').optional().isArray(),
  body('skinConcerns').optional().isArray(),
  body('knownSensitivities').optional().isArray()
], guestController.updatePreferences);

// Add viewed product to guest session
router.post('/viewed/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID format'),
  body('productId').isUUID().withMessage('Invalid product ID format')
], guestController.addViewedProduct);

// Convert guest session to user account
router.post('/convert/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID format'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required')
], guestController.convertToUser);

// Get guest recommendations (simplified product search for guests)
router.get('/recommendations/:sessionId', [
  param('sessionId').isUUID().withMessage('Invalid session ID format')
], async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20, category, brand } = req.query;

    const { GuestSession, Product } = require('../models');
    const { Op } = require('sequelize');

    // Get guest session
    const guestSession = await GuestSession.findOne({
      where: { 
        sessionId,
        isActive: true,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!guestSession) {
      return res.status(404).json({ 
        success: false, 
        message: 'Guest session not found or expired' 
      });
    }

    // Build query filters based on guest profile
    const where = { isActive: true };
    const filters = guestSession.getProductFilters();

    if (filters.suitableForSkinTypes) {
      where.suitableForSkinTypes = { [Op.contains]: [filters.suitableForSkinTypes] };
    }
    
    if (filters.addressesConcerns) {
      where.addressesConcerns = { [Op.overlap]: filters.addressesConcerns };
    }

    if (category) {
      where.mainCategory = { [Op.iLike]: `%${category}%` };
    }

    if (brand) {
      where.brand = { [Op.iLike]: `%${brand}%` };
    }

    // Apply formulation filters
    Object.keys(filters).forEach(key => {
      if (key.endsWith('Free') && filters[key]) {
        where[key] = true;
      }
    });

    // Get products
    const products = await Product.findAll({
      where,
      limit: parseInt(limit),
      order: [['rating', 'DESC'], ['viewCount', 'DESC']],
      attributes: { exclude: ['deletedAt'] }
    });

    // Update guest session activity
    await guestSession.updateActivity();

    res.json({
      success: true,
      data: {
        products,
        guestProfile: {
          skinType: guestSession.skinType,
          concerns: guestSession.skinConcerns,
          profileCompleteness: guestSession.profileCompleteness
        },
        totalProducts: products.length
      }
    });

  } catch (error) {
    console.error('Error getting guest recommendations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting recommendations', 
      error: error.message 
    });
  }
});

// Cleanup expired sessions (admin route - should be protected in production)
router.delete('/cleanup', guestController.cleanupExpiredSessions);

// Guest session health check
router.get('/health', async (req, res) => {
  try {
    const { GuestSession } = require('../models');
    const { Op } = require('sequelize');

    const stats = await GuestSession.findAll({
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "isActive" = true THEN 1 END')), 'active'],
        [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "expiresAt" < NOW() THEN 1 END')), 'expired']
      ],
      raw: true
    });

    res.json({
      success: true,
      data: {
        guestSessions: stats[0],
        status: 'healthy'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Guest system health check failed',
      error: error.message
    });
  }
});

module.exports = router;