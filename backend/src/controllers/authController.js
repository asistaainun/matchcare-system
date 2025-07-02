const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User, UserProfile } = require('../models');
const logger = require('../config/logger').auth;
const crypto = require('crypto');

class AuthController {
  // === USER REGISTRATION ===
  
  async register(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { email, password, firstName, lastName, agreedToTerms, agreedToMarketing } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        logger.logAuth('registration_failed', null, req.ip, { 
          reason: 'email_exists', 
          email 
        });
        
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }

      // Create user
      const userData = {
        email,
        password,
        firstName,
        lastName,
        agreedToMarketing: agreedToMarketing || false,
        lastIpAddress: req.ip,
        lastUserAgent: req.get('User-Agent')
      };

      if (agreedToTerms) {
        userData.agreedToTermsAt = new Date();
      }

      const user = await User.create(userData);

      // Generate email verification token
      const emailToken = crypto.randomBytes(32).toString('hex');
      await user.update({
        emailVerificationToken: emailToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      // Generate JWT token for immediate login
      const token = this.generateToken(user.id);

      // Create basic user profile
      await UserProfile.create({
        userId: user.id,
        profileCompleteness: 20 // Basic info completed
      });

      // Log successful registration
      logger.logAuth('registration_success', user.id, req.ip, {
        email: user.email,
        firstName: user.firstName
      });

      // Send response (exclude sensitive data)
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: user.toJSON(),
          token,
          requiresEmailVerification: true
        }
      });

      // TODO: Send welcome email with verification link
      // await this.sendWelcomeEmail(user, emailToken);

    } catch (error) {
      logger.error('Registration error:', error);
      
      // Log failed registration
      logger.logAuth('registration_failed', null, req.ip, {
        error: error.message,
        email: req.body.email
      });

      res.status(500).json({
        success: false,
        message: 'Error creating account',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // === USER LOGIN ===
  
  async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { email, password, rememberMe } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        logger.logAuth('login_failed', null, req.ip, { 
          reason: 'user_not_found', 
          email 
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if account is blocked
      if (user.isBlocked) {
        logger.logAuth('login_failed', user.id, req.ip, { 
          reason: 'account_blocked',
          blockedReason: user.blockedReason
        });
        
        return res.status(403).json({
          success: false,
          message: 'Account is temporarily blocked',
          blockedUntil: user.blockedUntil
        });
      }

      // Check if account is active
      if (!user.isActive) {
        logger.logAuth('login_failed', user.id, req.ip, { 
          reason: 'account_inactive' 
        });
        
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        logger.logAuth('login_failed', user.id, req.ip, { 
          reason: 'invalid_password' 
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update login information
      await user.updateLoginInfo(req.ip, req.get('User-Agent'));

      // Get user profile
      const userProfile = await UserProfile.findByUserId(user.id);

      // Generate JWT token
      const tokenExpiry = rememberMe ? '30d' : '24h';
      const token = this.generateToken(user.id, tokenExpiry);

      // Log successful login
      logger.logAuth('login_success', user.id, req.ip, {
        email: user.email,
        rememberMe: rememberMe || false
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          profile: userProfile,
          token,
          expiresIn: tokenExpiry
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error during login',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // === EMAIL VERIFICATION ===
  
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      // Find user by verification token
      const user = await User.findByEmailVerificationToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }

      // Update user as verified
      await user.update({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });

      // Update profile completeness
      user.updateProfileCompleteness();
      await user.save();

      logger.logAuth('email_verified', user.id, req.ip);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: user.toJSON()
        }
      });

    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error verifying email'
      });
    }
  }

  // === RESEND EMAIL VERIFICATION ===
  
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Generate new verification token
      const emailToken = crypto.randomBytes(32).toString('hex');
      await user.update({
        emailVerificationToken: emailToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      logger.logAuth('verification_resent', user.id, req.ip);

      res.json({
        success: true,
        message: 'Verification email sent'
      });

      // TODO: Send verification email
      // await this.sendVerificationEmail(user, emailToken);

    } catch (error) {
      logger.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending verification email'
      });
    }
  }

  // === PASSWORD RESET ===
  
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent'
        });
      }

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      await user.update({
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });

      logger.logAuth('password_reset_requested', user.id, req.ip);

      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });

      // TODO: Send password reset email
      // await this.sendPasswordResetEmail(user, resetToken);

    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing password reset request'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Find user by reset token
      const user = await User.findByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Update password
      await user.update({
        password: password,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      logger.logAuth('password_reset_completed', user.id, req.ip);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error resetting password'
      });
    }
  }

  // === PROFILE MANAGEMENT ===
  
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

      // Update last active
      await user.updateActivity(req.ip, req.get('User-Agent'));

      res.json({
        success: true,
        data: {
          user: user.toJSON(),
          profile: user.profile
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching profile'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { userId } = req.user;
      const { firstName, lastName, preferences } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (preferences !== undefined) updateData.preferences = { ...user.preferences, ...preferences };

      await user.update(updateData);

      logger.logUserAction(userId, 'profile_updated', updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toJSON()
        }
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile'
      });
    }
  }

  // === PASSWORD CHANGE ===
  
  async changePassword(req, res) {
    try {
      const { userId } = req.user;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        logger.logAuth('password_change_failed', userId, req.ip, { 
          reason: 'invalid_current_password' 
        });
        
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      await user.update({ password: newPassword });

      logger.logAuth('password_changed', userId, req.ip);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error changing password'
      });
    }
  }

  // === TOKEN MANAGEMENT ===
  
  async refreshToken(req, res) {
    try {
      const { userId } = req.user;

      // Generate new token
      const token = this.generateToken(userId);

      logger.logAuth('token_refreshed', userId, req.ip);

      res.json({
        success: true,
        data: { token }
      });

    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Error refreshing token'
      });
    }
  }

  async logout(req, res) {
    try {
      const { userId } = req.user;

      logger.logAuth('logout', userId, req.ip);

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
  }

  // === ACCOUNT MANAGEMENT ===
  
  async deleteAccount(req, res) {
    try {
      const { userId } = req.user;
      const { password, reason } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
      }

      // Soft delete user (paranoid: true)
      await user.destroy();

      logger.logAuth('account_deleted', userId, req.ip, { reason });

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting account'
      });
    }
  }

  // === UTILITY METHODS ===
  
  generateToken(userId, expiresIn = '24h') {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  }

  async sendWelcomeEmail(user, verificationToken) {
    // TODO: Implement email sending
    logger.info(`Welcome email would be sent to ${user.email} with token ${verificationToken}`);
  }

  async sendVerificationEmail(user, verificationToken) {
    // TODO: Implement email sending
    logger.info(`Verification email would be sent to ${user.email} with token ${verificationToken}`);
  }

  async sendPasswordResetEmail(user, resetToken) {
    // TODO: Implement email sending
    logger.info(`Password reset email would be sent to ${user.email} with token ${resetToken}`);
  }

  // === ADMIN METHODS ===
  
  async getUserStats(req, res) {
    try {
      // Only allow admins
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const stats = {
        totalUsers: await User.count(),
        activeUsers: await User.count({ where: { isActive: true } }),
        verifiedUsers: await User.count({ where: { isEmailVerified: true } }),
        recentRegistrations: await User.getRegistrationStats(7), // Last 7 days
        profileCompletion: await UserProfile.getCompletionStats()
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user statistics'
      });
    }
  }
}

module.exports = new AuthController();