const { Op } = require('sequelize');
const { Ingredient, Product, UserProfile } = require('../models');

class IngredientController {
  // Get all ingredients with filtering
  async getIngredients(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        category,
        skinType,
        concerns,
        search,
        keyIngredientsOnly = false
      } = req.query;

      const where = { isActive: true };

      if (category) {
        where.functionalCategories = { [Op.contains]: [category] };
      }
      
      if (skinType) {
        where.suitableForSkinTypes = { [Op.contains]: [skinType] };
      }
      
      if (concerns) {
        const concernsArray = concerns.split(',');
        where.addressesConcerns = { [Op.overlap]: concernsArray };
      }
      
      if (keyIngredientsOnly === 'true') {
        where.isKeyIngredient = true;
      }
      
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { alternativeNames: { [Op.contains]: [search] } },
          { explanation: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows: ingredients } = await Ingredient.findAndCountAll({
        where,
        order: [['popularityScore', 'DESC'], ['name', 'ASC']],
        limit: parseInt(limit),
        offset
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: {
          ingredients,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalIngredients: count,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching ingredients:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching ingredients', 
        error: error.message 
      });
    }
  }

  // Get single ingredient by ID
  async getIngredientById(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      const ingredient = await Ingredient.findByPk(id, {
        where: { isActive: true }
      });

      if (!ingredient) {
        return res.status(404).json({ 
          success: false, 
          message: 'Ingredient not found' 
        });
      }

      // Increment search count
      await ingredient.increment('searchCount');

      let ingredientData = ingredient.get({ plain: true });

      // Calculate compatibility score if user provided
      if (userId) {
        const userProfile = await UserProfile.findOne({ where: { userId } });
        if (userProfile) {
          ingredientData.compatibilityScore = ingredient.getCompatibilityScore(userProfile);
        }
      }

      // Get products containing this ingredient
      const products = await Product.findAll({
        where: {
          [Op.or]: [
            { ingredients: { [Op.contains]: [ingredient.name] } },
            { keyIngredients: { [Op.contains]: [ingredient.name] } }
          ],
          isActive: true
        },
        limit: 6,
        attributes: ['id', 'productName', 'brand', 'mainCategory', 'regularPrice', 'salePrice', 'rating', 'reviewCount'],
        order: [['rating', 'DESC']]
      });

      ingredientData.relatedProducts = products.map(p => p.get({ plain: true }));

      res.json({
        success: true,
        data: ingredientData
      });

    } catch (error) {
      console.error('Error fetching ingredient:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching ingredient', 
        error: error.message 
      });
    }
  }

  // Search ingredients
  async searchIngredients(req, res) {
    try {
      const { query, limit = 20 } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Search query is required' 
        });
      }

      const ingredients = await Ingredient.findAll({
        where: {
          [Op.and]: [
            { isActive: true },
            {
              [Op.or]: [
                { name: { [Op.iLike]: `%${query}%` } },
                { alternativeNames: { [Op.contains]: [query] } },
                { explanation: { [Op.iLike]: `%${query}%` } }
              ]
            }
          ]
        },
        order: [['popularityScore', 'DESC']],
        limit: parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          ingredients,
          query,
          count: ingredients.length
        }
      });

    } catch (error) {
      console.error('Error searching ingredients:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error searching ingredients', 
        error: error.message 
      });
    }
  }

  // Get ingredient categories
  async getCategories(req, res) {
    try {
      const categoriesResult = await Ingredient.findAll({
        attributes: ['functionalCategories'],
        where: { 
          isActive: true,
          functionalCategories: { [Op.ne]: [] }
        }
      });

      // Flatten and deduplicate categories
      const categories = [...new Set(
        categoriesResult
          .flatMap(item => item.functionalCategories || [])
          .filter(cat => cat && cat.length > 0)
      )].sort();

      res.json({
        success: true,
        data: categories
      });

    } catch (error) {
      console.error('Error fetching ingredient categories:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching ingredient categories', 
        error: error.message 
      });
    }
  }

  // Get key ingredients
  async getKeyIngredients(req, res) {
    try {
      const keyIngredients = await Ingredient.findAll({
        where: { 
          isKeyIngredient: true,
          isActive: true 
        },
        order: [['popularityScore', 'DESC']],
        attributes: ['id', 'name', 'alternativeNames', 'functionalCategories', 'addressesConcerns', 'explanation']
      });

      res.json({
        success: true,
        data: keyIngredients
      });

    } catch (error) {
      console.error('Error fetching key ingredients:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching key ingredients', 
        error: error.message 
      });
    }
  }
}

module.exports = new IngredientController();