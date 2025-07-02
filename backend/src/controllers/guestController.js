const { Op } = require('sequelize');
const { GuestSession, User, UserProfile, Product } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

class GuestController {
  // Create new guest session
  async createSession(req, res) {
    try {
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Create guest session
      const guestSession = await GuestSession.create({
        userAgent,
        ipAddress,
        lastActivity: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Guest session created successfully',
        data: {
          sessionId: guestSession.sessionId,
          expiresAt: guestSession.expiresAt
        }
      });

    } catch (error) {
      console.error('Error creating guest session:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating guest session',
        error: error.message
      });
    }
  }

  // Get guest session
  async getSession(req, res) {
    try {
      const { sessionId } = req.params;

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

      // Update last activity
      await guestSession.updateActivity();

      res.json({
        success: true,
        data: {
          sessionId: guestSession.sessionId,
          profile: guestSession.profile,
          viewedProducts: guestSession.viewedProducts || [],
          preferences: guestSession.preferences || {},
          profileCompleteness: guestSession.profileCompleteness,
          expiresAt: guestSession.expiresAt,
          lastActivity: guestSession.lastActivity
        }
      });

    } catch (error) {
      console.error('Error fetching guest session:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching guest session',
        error: error.message
      });
    }
  }

  // Submit quiz for guest
  async submitQuiz(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;
      const { responses } = req.body;

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

      // Process skin type assessment if needed
      let skinType = responses.skin_type;
      if (skinType === 'unsure') {
        skinType = this.determineSkinType(responses);
      }

      // Parse budget range
      const budgetRange = this.parseBudgetRange(responses.budget_range);

      // Create profile data
      const profileData = {
        skinType: skinType,
        skinConcerns: responses.skin_concerns || [],
        knownSensitivities: responses.sensitivities || [],
        routineComplexity: responses.routine_complexity || 'moderate',
        budgetRange: budgetRange,
        lastQuizDate: new Date(),
        quizResponses: Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          answer,
          timestamp: new Date()
        })),
        skinAnalysis: this.calculateSkinAnalysis(responses)
      };

      // Calculate profile completeness
      const completeness = this.calculateCompleteness(profileData);
      profileData.profileCompleteness = completeness;

      // Update guest session
      await guestSession.update({
        profile: profileData,
        profileCompleteness: completeness,
        lastActivity: new Date()
      });

      res.json({
        success: true,
        message: 'Quiz submitted successfully',
        data: {
          profile: profileData,
          skinType,
          analysisComplete: true
        }
      });

    } catch (error) {
      console.error('Error submitting guest quiz:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting quiz',
        error: error.message
      });
    }
  }

  // Update guest preferences
  async updatePreferences(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;
      const preferences = req.body;

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

      // Merge with existing preferences
      const currentPreferences = guestSession.preferences || {};
      const updatedPreferences = { ...currentPreferences, ...preferences };

      await guestSession.update({
        preferences: updatedPreferences,
        lastActivity: new Date()
      });

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: {
          preferences: updatedPreferences
        }
      });

    } catch (error) {
      console.error('Error updating guest preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating preferences',
        error: error.message
      });
    }
  }

  // Add viewed product
  async addViewedProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;
      const { productId } = req.body;

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

      // Add product to viewed list (avoid duplicates)
      const currentViewed = guestSession.viewedProducts || [];
      const updatedViewed = currentViewed.includes(productId)
        ? currentViewed
        : [...currentViewed, productId];

      await guestSession.update({
        viewedProducts: updatedViewed,
        lastActivity: new Date()
      });

      res.json({
        success: true,
        message: 'Product view tracked',
        data: {
          viewedProducts: updatedViewed
        }
      });

    } catch (error) {
      console.error('Error tracking viewed product:', error);
      res.status(500).json({
        success: false,
        message: 'Error tracking product view',
        error: error.message
      });
    }
  }

  // Convert guest session to user account
  async convertToUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;
      const { email, password, firstName, lastName } = req.body;

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

      // Create user profile if guest has profile data
      let userProfile = null;
      if (guestSession.profile) {
        userProfile = await UserProfile.create({
          userId: user.id,
          ...guestSession.profile
        });

        // Calculate and update completeness
        userProfile.calculateCompleteness();
        await userProfile.save();

        // Update user profile completion status
        await user.update({
          isProfileComplete: userProfile.profileCompleteness >= 80
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      // Deactivate guest session
      await guestSession.update({
        isActive: false,
        convertedToUserId: user.id,
        lastActivity: new Date()
      });

      res.json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: user.toJSON(),
          profile: userProfile,
          token,
          migratedData: {
            profileData: !!guestSession.profile,
            viewedProducts: guestSession.viewedProducts?.length || 0,
            preferences: Object.keys(guestSession.preferences || {}).length
          }
        }
      });

    } catch (error) {
      console.error('Error converting guest to user:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user account',
        error: error.message
      });
    }
  }

  // Cleanup expired sessions
  async cleanupExpiredSessions(req, res) {
    try {
      const expiredCount = await GuestSession.destroy({
        where: {
          [Op.or]: [
            { expiresAt: { [Op.lt]: new Date() } },
            { 
              isActive: true,
              lastActivity: { 
                [Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
              }
            }
          ]
        }
      });

      res.json({
        success: true,
        message: 'Expired sessions cleaned up',
        data: {
          deletedSessions: expiredCount,
          cleanupTime: new Date()
        }
      });

    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Error during cleanup',
        error: error.message
      });
    }
  }

  // Helper methods
  determineSkinType(responses) {
    const morning = responses.skin_assessment;
    const shine = responses.oily_shine;
    const flaky = responses.flaky_patches;

    let dryScore = 0;
    let oilyScore = 0;
    let normalScore = 0;
    let combinationScore = 0;

    // Morning feeling scoring
    if (morning === 'tight_dry') dryScore += 3;
    else if (morning === 'normal_balanced') normalScore += 3;
    else if (morning === 'oily_shiny') oilyScore += 3;
    else if (morning === 'combination') combinationScore += 3;

    // Oil shine scoring
    if (shine === 'rarely_dry') dryScore += 2;
    else if (shine === 'rarely_balanced') normalScore += 2;
    else if (shine === 'often_shiny') oilyScore += 2;
    else if (shine === 'tzone_only') combinationScore += 2;

    // Flaky patches scoring
    if (flaky === 'yes_frequently') dryScore += 2;
    else if (flaky === 'rarely') normalScore += 1;
    else if (flaky === 'almost_never') oilyScore += 1;
    else if (flaky === 'sometimes_cheeks') combinationScore += 1;

    // Determine highest score
    const scores = { dry: dryScore, oily: oilyScore, normal: normalScore, combination: combinationScore };
    const maxScore = Math.max(...Object.values(scores));
    
    for (const [type, score] of Object.entries(scores)) {
      if (score === maxScore) return type;
    }

    return 'normal'; // Default fallback
  }

  parseBudgetRange(budgetResponse) {
    const budgetMap = {
      'budget': { min: 5, max: 15 },
      'mid_range': { min: 15, max: 40 },
      'high_end': { min: 40, max: 80 },
      'luxury': { min: 80, max: 200 },
      'mixed': { min: 5, max: 80 }
    };

    return budgetMap[budgetResponse] || { min: 5, max: 50 };
  }

  calculateSkinAnalysis(responses) {
    const analysis = {
      tZoneOiliness: 3,
      cheekDryness: 3,
      sensitivity: 3,
      acneProneness: 3,
      confidenceScore: 85
    };

    // Adjust based on skin type
    const skinType = responses.skin_type;
    if (skinType === 'oily') {
      analysis.tZoneOiliness = 5;
      analysis.cheekDryness = 2;
    } else if (skinType === 'dry') {
      analysis.tZoneOiliness = 2;
      analysis.cheekDryness = 5;
    } else if (skinType === 'combination') {
      analysis.tZoneOiliness = 4;
      analysis.cheekDryness = 4;
    } else if (skinType === 'sensitive') {
      analysis.sensitivity = 5;
    }

    // Adjust based on concerns
    const concerns = responses.skin_concerns || [];
    if (concerns.includes('acne')) analysis.acneProneness = 5;
    if (concerns.includes('sensitivity') || concerns.includes('redness')) analysis.sensitivity = 5;
    if (concerns.includes('dryness')) analysis.cheekDryness = Math.max(analysis.cheekDryness, 4);
    if (concerns.includes('oiliness')) analysis.tZoneOiliness = Math.max(analysis.tZoneOiliness, 4);

    return analysis;
  }

  calculateCompleteness(profileData) {
    let score = 0;
    
    // Basic information (40%)
    if (profileData.skinType) score += 20;
    if (profileData.skinConcerns && profileData.skinConcerns.length > 0) score += 20;
    
    // Preferences (30%)
    if (profileData.knownSensitivities && profileData.knownSensitivities.length > 0) score += 10;
    if (profileData.routineComplexity) score += 10;
    if (profileData.budgetRange && profileData.budgetRange.max > 0) score += 10;
    
    // Advanced (30%)
    if (profileData.skinAnalysis) score += 30;
    
    return score;
  }
}

module.exports = new GuestController();