const express = require('express');
const router = express.Router();
const recommendationEngine = require('../services/recommendationEngine');
const auth = require('../middleware/auth');
const { validationResult, query } = require('express-validator');

// Get personalized recommendations
router.get('/user/:userId', 
  auth,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('category').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors', 
          errors: errors.array() 
        });
      }

      const { userId } = req.params;
      const { limit = 10, category, forceRecalculate = false } = req.query;

      // Verify user has access to this userId
      if (req.user.userId !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }

      const recommendations = await recommendationEngine.generateRecommendations(userId, {
        limit: parseInt(limit),
        category,
        forceRecalculate: forceRecalculate === 'true'
      });

      res.json({
        success: true,
        data: recommendations
      });

    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting recommendations', 
        error: error.message 
      });
    }
  }
);

// Get routine recommendations
router.get('/routine/:userId', 
  auth,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Verify user has access to this userId
      if (req.user.userId !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied' 
        });
      }

      const routine = await recommendationEngine.generateRoutineRecommendations(userId);

      res.json({
        success: true,
        data: routine
      });

    } catch (error) {
      console.error('Error getting routine recommendations:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting routine recommendations', 
        error: error.message 
      });
    }
  }
);

// Get similar products based on ingredients
router.get('/similar/:productId',
  [
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors', 
          errors: errors.array() 
        });
      }

      const { productId } = req.params;
      const { limit = 5 } = req.query;

      const similarProducts = await recommendationEngine.getIngredientBasedRecommendations(
        productId, 
        parseInt(limit)
      );

      res.json({
        success: true,
        data: {
          similarProducts,
          count: similarProducts.length
        }
      });

    } catch (error) {
      console.error('Error getting similar products:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting similar products', 
        error: error.message 
      });
    }
  }
);

// Get trending products
router.get('/trending',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors', 
          errors: errors.array() 
        });
      }

      const { limit = 10 } = req.query;

      const trending = await recommendationEngine.getTrendingRecommendations(parseInt(limit));

      res.json({
        success: true,
        data: {
          trending,
          count: trending.length
        }
      });

    } catch (error) {
      console.error('Error getting trending products:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting trending products', 
        error: error.message 
      });
    }
  }
);

module.exports = router;