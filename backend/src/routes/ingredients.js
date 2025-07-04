const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const { query, body } = require('express-validator');

// All ingredient routes are public for browsing
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('skinType').optional().isString(),
  query('concerns').optional().isString(),
  query('search').optional().isString(),
  query('keyIngredientsOnly').optional().isBoolean()
], ingredientController.getIngredients);

router.get('/categories', ingredientController.getCategories);
router.get('/key-ingredients', ingredientController.getKeyIngredients);

router.get('/:id', [
  query('userId').optional().isUUID()
], ingredientController.getIngredientById);

router.post('/search', [
  body('query').notEmpty().isString(),
  body('limit').optional().isInt({ min: 1, max: 100 })
], ingredientController.searchIngredients);

module.exports = router;