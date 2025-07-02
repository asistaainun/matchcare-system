const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const { query, body } = require('express-validator');

// Public routes
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('brand').optional().isString(),
  query('skinType').optional().isString(),
  query('concerns').optional().isString(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('search').optional().isString(),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['ASC', 'DESC']),
  query('userId').optional().isUUID()
], productController.getProducts);

router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);

router.get('/:id', [
  query('userId').optional().isUUID()
], productController.getProductById);

router.post('/search', [
  body('query').notEmpty().isString(),
  body('userId').optional().isUUID(),
  body('limit').optional().isInt({ min: 1, max: 100 })
], productController.searchProducts);

// Protected routes
router.get('/recommendations/:userId', auth, productController.getRecommendations);

module.exports = router;