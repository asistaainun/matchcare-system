const { Op } = require('sequelize');
const { Product, UserProfile, ProductMatchScore, Ingredient } = require('../models');
const { validationResult } = require('express-validator');

class ProductController {
  // Get all products with filtering and pagination
  async getProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        brand,
        skinType,
        concerns,
        minPrice,
        maxPrice,
        search,
        sortBy = 'productName',
        sortOrder = 'ASC',
        userId
      } = req.query;

      // Build where clause
      const where = { isActive: true };

      if (category) {
        where.mainCategory = { [Op.iLike]: `%${category}%` };
      }
      
      if (brand) {
        where.brand = { [Op.iLike]: `%${brand}%` };
      }
      
      if (skinType) {
        where.suitableForSkinTypes = { [Op.contains]: [skinType] };
      }
      
      if (concerns) {
        const concernsArray = concerns.split(',');
        where.addressesConcerns = { [Op.overlap]: concernsArray };
      }
      
      if (minPrice || maxPrice) {
        where[Op.or] = [];
        if (minPrice) {
          where[Op.or].push({ regularPrice: { [Op.gte]: parseFloat(minPrice) } });
        }
        if (maxPrice) {
          where[Op.or].push({ regularPrice: { [Op.lte]: parseFloat(maxPrice) } });
        }
      }
      
      if (search) {
        where[Op.or] = [
          { productName: { [Op.iLike]: `%${search}%` } },
          { brand: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Sort options
      const order = [[sortBy, sortOrder.toUpperCase()]];

      // Execute query with pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const { count, rows: products } = await Product.findAndCountAll({
        where,
        order,
        limit: parseInt(limit),
        offset,
        attributes: { exclude: ['deletedAt'] }
      });

      // Calculate match scores if user is provided
      let productsWithScores = products;
      if (userId) {
        const userProfile = await UserProfile.findOne({ where: { userId } });
        if (userProfile) {
          productsWithScores = products.map(product => {
            const matchResult = product.calculateMatchScore(userProfile);
            return {
              ...product.get({ plain: true }),
              matchScore: matchResult.score,
              matchReasons: matchResult.reasons
            };
          });
        }
      }

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: {
          products: productsWithScores,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalProducts: count,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching products', 
        error: error.message 
      });
    }
  }

  // Get single product by ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.query;

      const product = await Product.findByPk(id, {
        where: { isActive: true }
      });

      if (!product) {
        return res.status(404).json({ 
          success: false, 
          message: 'Product not found' 
        });
      }

      // Increment view count
      await product.increment('viewCount');

      let productData = product.get({ plain: true });

      // Calculate match score if user is provided
      if (userId) {
        const userProfile = await UserProfile.findOne({ where: { userId } });
        if (userProfile) {
          const matchResult = product.calculateMatchScore(userProfile);
          productData.matchScore = matchResult.score;
          productData.matchReasons = matchResult.reasons;
        }
      }

      // Get similar products
      const similarProducts = await this.getSimilarProducts(product, 4);
      productData.similarProducts = similarProducts;

      res.json({
        success: true,
        data: productData
      });

    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching product', 
        error: error.message 
      });
    }
  }

  // Get personalized recommendations
  async getRecommendations(req, res) {
    try {
      const { userId } = req.params;
      const { limit = 10, category } = req.query;

      const userProfile = await UserProfile.findOne({ where: { userId } });
      if (!userProfile) {
        return res.status(404).json({ 
          success: false, 
          message: 'User profile not found' 
        });
      }

      // Build query based on user profile
      const where = { isActive: true };
      const filters = userProfile.getProductFilters();
      
      if (filters.suitableForSkinTypes) {
        where.suitableForSkinTypes = { [Op.contains]: [filters.suitableForSkinTypes] };
      }
      
      if (filters.addressesConcerns) {
        where.addressesConcerns = { [Op.overlap]: filters.addressesConcerns };
      }
      
      if (category) {
        where.mainCategory = { [Op.iLike]: `%${category}%` };
      }

      // Apply formulation filters
      Object.keys(filters).forEach(key => {
        if (key.endsWith('Free') && filters[key]) {
          where[key] = true;
        }
      });

      const products = await Product.findAll({
        where,
        limit: parseInt(limit) * 2,
        order: [['rating', 'DESC'], ['reviewCount', 'DESC']]
      });

      // Calculate match scores and sort
      const scoredProducts = products.map(product => {
        const matchResult = product.calculateMatchScore(userProfile);
        return {
          ...product.get({ plain: true }),
          matchScore: matchResult.score,
          matchReasons: matchResult.reasons
        };
      });

      scoredProducts.sort((a, b) => b.matchScore - a.matchScore);
      const recommendations = scoredProducts.slice(0, parseInt(limit));

      res.json({
        success: true,
        data: {
          recommendations,
          userProfile: {
            skinType: userProfile.skinType,
            concerns: userProfile.skinConcerns
          }
        }
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

  // Search products
  async searchProducts(req, res) {
    try {
      const { query, userId, limit = 20 } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Search query is required' 
        });
      }

      // Perform search
      const searchWhere = {
        [Op.and]: [
          { isActive: true },
          {
            [Op.or]: [
              { productName: { [Op.iLike]: `%${query}%` } },
              { brand: { [Op.iLike]: `%${query}%` } },
              { description: { [Op.iLike]: `%${query}%` } },
              { keyIngredients: { [Op.contains]: [query] } }
            ]
          }
        ]
      };

      const products = await Product.findAll({
        where: searchWhere,
        limit: parseInt(limit),
        order: [['rating', 'DESC'], ['reviewCount', 'DESC']]
      });

      // Add match scores if user provided
      let productsWithScores = products;
      if (userId) {
        const userProfile = await UserProfile.findOne({ where: { userId } });
        if (userProfile) {
          productsWithScores = products.map(product => {
            const matchResult = product.calculateMatchScore(userProfile);
            return {
              ...product.get({ plain: true }),
              matchScore: matchResult.score,
              matchReasons: matchResult.reasons
            };
          });
        }
      }

      res.json({
        success: true,
        data: {
          products: productsWithScores,
          query,
          count: products.length
        }
      });

    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error searching products', 
        error: error.message 
      });
    }
  }

  // Get product categories
  async getCategories(req, res) {
    try {
      const categories = await Product.findAll({
        attributes: ['mainCategory'],
        group: ['mainCategory'],
        where: { isActive: true }
      });

      const subcategories = await Product.findAll({
        attributes: ['mainCategory', 'subcategory'],
        group: ['mainCategory', 'subcategory'],
        where: { 
          isActive: true,
          subcategory: { [Op.ne]: null }
        }
      });

      const categoriesData = categories.map(cat => cat.mainCategory);
      const subcategoriesData = subcategories.reduce((acc, item) => {
        if (!acc[item.mainCategory]) {
          acc[item.mainCategory] = [];
        }
        if (item.subcategory) {
          acc[item.mainCategory].push(item.subcategory);
        }
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          categories: categoriesData,
          subcategories: subcategoriesData
        }
      });

    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching categories', 
        error: error.message 
      });
    }
  }

  // Get brands
  async getBrands(req, res) {
    try {
      const brands = await Product.findAll({
        attributes: ['brand'],
        group: ['brand'],
        where: { isActive: true },
        order: [['brand', 'ASC']]
      });

      const brandsData = brands.map(brand => brand.brand);

      res.json({
        success: true,
        data: brandsData
      });

    } catch (error) {
      console.error('Error fetching brands:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching brands', 
        error: error.message 
      });
    }
  }

  // Helper method to get similar products
  async getSimilarProducts(product, limit = 4) {
    try {
      const similarProducts = await Product.findAll({
        where: {
          id: { [Op.ne]: product.id },
          isActive: true,
          [Op.or]: [
            { mainCategory: product.mainCategory },
            { keyIngredients: { [Op.overlap]: product.keyIngredients } },
            { addressesConcerns: { [Op.overlap]: product.addressesConcerns } }
          ]
        },
        limit,
        attributes: ['id', 'productName', 'brand', 'mainCategory', 'regularPrice', 'salePrice', 'rating', 'reviewCount'],
        order: [['rating', 'DESC']]
      });

      return similarProducts.map(p => p.get({ plain: true }));
    } catch (error) {
      console.error('Error getting similar products:', error);
      return [];
    }
  }
}

module.exports = new ProductController();