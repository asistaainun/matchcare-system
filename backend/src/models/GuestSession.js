const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GuestSession = sequelize.define('GuestSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sessionId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    unique: true,
    allowNull: false
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  profile: {
    type: DataTypes.JSONB,
    defaultValue: null,
    comment: 'Guest user profile data from quiz'
  },
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'User preferences like avoided/preferred ingredients'
  },
  viewedProducts: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: [],
    comment: 'List of product IDs viewed by guest'
  },
  profileCompleteness: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  expiresAt: {
    type: DataTypes.DATE,
    defaultValue: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  convertedToUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User ID if guest session was converted to account'
  },
  sessionData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional session-specific data'
  }
}, {
  tableName: 'guest_sessions',
  indexes: [
    { fields: ['sessionId'], unique: true },
    { fields: ['isActive'] },
    { fields: ['expiresAt'] },
    { fields: ['lastActivity'] },
    { fields: ['convertedToUserId'] },
    { fields: ['ipAddress'] }
  ]
});

// Instance methods
GuestSession.prototype.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

GuestSession.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

GuestSession.prototype.extendSession = function(hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  this.lastActivity = new Date();
  return this.save();
};

GuestSession.prototype.getProductFilters = function() {
  const filters = {};
  
  if (!this.profile) return filters;
  
  // Skin type filter
  if (this.profile.skinType) {
    filters.suitableForSkinTypes = this.profile.skinType;
  }
  
  // Concerns filter
  if (this.profile.skinConcerns && this.profile.skinConcerns.length > 0) {
    filters.addressesConcerns = this.profile.skinConcerns;
  }
  
  // Formulation preferences from profile
  const formulationFilters = {};
  if (this.profile.knownSensitivities && this.profile.knownSensitivities.includes('fragrance')) {
    formulationFilters.fragranceFree = true;
  }
  if (this.profile.knownSensitivities && this.profile.knownSensitivities.includes('alcohol')) {
    formulationFilters.alcoholFree = true;
  }
  if (this.profile.knownSensitivities && this.profile.knownSensitivities.includes('silicone')) {
    formulationFilters.siliconeFree = true;
  }
  if (this.profile.knownSensitivities && this.profile.knownSensitivities.includes('sulfates')) {
    formulationFilters.sulfateFree = true;
  }
  if (this.profile.knownSensitivities && this.profile.knownSensitivities.includes('parabens')) {
    formulationFilters.parabenFree = true;
  }
  
  // Formulation preferences from preferences object
  if (this.preferences) {
    Object.keys(this.preferences).forEach(key => {
      if (key.endsWith('Free') && this.preferences[key]) {
        formulationFilters[key] = true;
      }
    });
  }
  
  return { ...filters, ...formulationFilters };
};

GuestSession.prototype.addViewedProduct = function(productId) {
  if (!this.viewedProducts) {
    this.viewedProducts = [];
  }
  
  if (!this.viewedProducts.includes(productId)) {
    this.viewedProducts = [...this.viewedProducts, productId];
    this.lastActivity = new Date();
    return this.save();
  }
  
  return Promise.resolve(this);
};

GuestSession.prototype.updateProfile = function(profileData) {
  this.profile = {
    ...this.profile,
    ...profileData
  };
  
  this.profileCompleteness = this.calculateCompleteness();
  this.lastActivity = new Date();
  
  return this.save();
};

GuestSession.prototype.updatePreferences = function(preferences) {
  this.preferences = {
    ...this.preferences,
    ...preferences
  };
  
  this.lastActivity = new Date();
  return this.save();
};

GuestSession.prototype.calculateCompleteness = function() {
  if (!this.profile) return 0;
  
  let score = 0;
  
  // Basic information (60%)
  if (this.profile.skinType) score += 30;
  if (this.profile.skinConcerns && this.profile.skinConcerns.length > 0) score += 30;
  
  // Preferences (40%)
  if (this.profile.knownSensitivities && this.profile.knownSensitivities.length > 0) score += 15;
  if (this.profile.routineComplexity) score += 10;
  if (this.profile.budgetRange && this.profile.budgetRange.max > 0) score += 15;
  
  return Math.min(100, score);
};

GuestSession.prototype.getSessionSummary = function() {
  return {
    sessionId: this.sessionId,
    isActive: this.isActive,
    isExpired: this.isExpired(),
    profileCompleteness: this.profileCompleteness,
    hasProfile: !!this.profile,
    viewedProductsCount: this.viewedProducts ? this.viewedProducts.length : 0,
    lastActivity: this.lastActivity,
    expiresAt: this.expiresAt,
    daysUntilExpiry: Math.ceil((this.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
  };
};

// Static methods
GuestSession.findActiveSession = function(sessionId) {
  return this.findOne({
    where: {
      sessionId,
      isActive: true,
      expiresAt: { [require('sequelize').Op.gt]: new Date() }
    }
  });
};

GuestSession.cleanupExpired = function() {
  return this.destroy({
    where: {
      [require('sequelize').Op.or]: [
        { expiresAt: { [require('sequelize').Op.lt]: new Date() } },
        { 
          isActive: true,
          lastActivity: { 
            [require('sequelize').Op.lt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
          }
        }
      ]
    }
  });
};

GuestSession.getActiveSessionsCount = function() {
  return this.count({
    where: {
      isActive: true,
      expiresAt: { [require('sequelize').Op.gt]: new Date() }
    }
  });
};

GuestSession.getSessionStats = function() {
  return this.findAll({
    attributes: [
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total'],
      [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "isActive" = true AND "expiresAt" > NOW() THEN 1 END')), 'active'],
      [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "expiresAt" < NOW() THEN 1 END')), 'expired'],
      [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "convertedToUserId" IS NOT NULL THEN 1 END')), 'converted'],
      [require('sequelize').fn('COUNT', require('sequelize').literal('CASE WHEN "profile" IS NOT NULL THEN 1 END')), 'withProfile']
    ],
    raw: true
  });
};

// Hooks
GuestSession.beforeCreate((guestSession) => {
  // Ensure sessionId is generated
  if (!guestSession.sessionId) {
    guestSession.sessionId = require('crypto').randomUUID();
  }
  
  // Set default expiry if not provided
  if (!guestSession.expiresAt) {
    guestSession.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  
  guestSession.lastActivity = new Date();
});

GuestSession.beforeUpdate((guestSession) => {
  // Auto-update profile completeness if profile changed
  if (guestSession.changed('profile') && guestSession.profile) {
    guestSession.profileCompleteness = guestSession.calculateCompleteness();
  }
});

module.exports = GuestSession;