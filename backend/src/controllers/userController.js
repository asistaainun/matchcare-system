const { User, UserProfile, Product, UserFavorite } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

class UserController {
  // User registration
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors', 
          errors: errors.array() 
        });
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User already exists with this email' 
        });
      }

      // Create user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          token
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating user', 
        error: error.message 
      });
    }
  }

  // User login
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation errors', 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ 
        where: { 
          email: email.toLowerCase(), 
          isActive: true 
        }
      });

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid email or password' 
        });
      }

      // Update login info
      await user.update({
        lastLogin: new Date(),
        loginCount: user.loginCount + 1
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      // Get user profile if exists
      const userProfile = await UserProfile.findOne({ where: { userId: user.id } });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          profile: userProfile,
          token
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error during login', 
        error: error.message 
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const { userId } = req.user;

      const user = await User.findByPk(userId, {
        include: [{
          model: UserProfile,
          as: 'profile'
        }]
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          profile: user.profile
        }
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching profile', 
        error: error.message 
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { userId } = req.user;
      const { firstName, lastName, preferences } = req.body;

      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (preferences) updateData.preferences = preferences;

      const [updatedRowsCount, updatedUsers] = await User.update(
        updateData,
        { 
          where: { id: userId },
          returning: true
        }
      );

      if (updatedRowsCount === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const updatedUser = updatedUsers[0];

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser.toJSON()
        }
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating profile', 
        error: error.message 
      });
    }
  }

  // Get user favorites
  async getFavorites(req, res) {
    try {
      const { userId } = req.user;

      const user = await User.findByPk(userId, {
        include: [{
          model: Product,
          as: 'favoriteProducts',
          through: { attributes: [] },
          attributes: ['id', 'productName', 'brand', 'mainCategory', 'regularPrice', 'salePrice', 'rating', 'reviewCount']
        }]
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      res.json({
        success: true,
        data: {
          favorites: user.favoriteProducts || []
        }
      });

    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching favorites', 
        error: error.message 
      });
    }
  }

  // Add to favorites
  async addToFavorites(req, res) {
    try {
      const { userId } = req.user;
      const { productId } = req.body;

      // Check if already in favorites
      const existingFavorite = await UserFavorite.findOne({
        where: { userId, productId }
      });

      if (existingFavorite) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product already in favorites' 
        });
      }

      // Add to favorites
      await UserFavorite.create({ userId, productId });

      // Update product favorite count
      await Product.increment('favoriteCount', { where: { id: productId } });

      res.json({
        success: true,
        message: 'Product added to favorites'
      });

    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error adding to favorites', 
        error: error.message 
      });
    }
  }

  // Remove from favorites
  async removeFromFavorites(req, res) {
    try {
      const { userId } = req.user;
      const { productId } = req.params;

      const deleted = await UserFavorite.destroy({
        where: { userId, productId }
      });

      if (deleted === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Favorite not found' 
        });
      }

      // Update product favorite count
      await Product.decrement('favoriteCount', { where: { id: productId } });

      res.json({
        success: true,
        message: 'Product removed from favorites'
      });

    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error removing from favorites', 
        error: error.message 
      });
    }
  }
}

module.exports = new UserController();