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
  
  // Skin Profile Data
  skinType: {
    type: DataTypes.ENUM('normal', 'dry', 'oily', 'combination', 'sensitive'),
    allowNull: true
  },
  skinConcerns: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  knownSensitivities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  routineComplexity: {
    type: DataTypes.ENUM('minimal', 'moderate', 'extensive'),
    defaultValue: 'moderate'
  },
  budgetRange: {
    type: DataTypes.JSONB,
    defaultValue: { min: 0, max: 100 }
  },
  
  // Preferences
  avoidedIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  preferredIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Quiz Data
  quizResponses: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  skinAnalysis: {
    type: DataTypes.JSONB,
    defaultValue: {
      tZoneOiliness: 3,
      cheekDryness: 3,
      sensitivity: 3,
      acneProneness: 3,
      confidenceScore: 85
    }
  },
  
  // Activity Tracking
  viewedProducts: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    defaultValue: []
  },
  searchHistory: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Session Management
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
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Browser/Device Info (optional)
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'guest_sessions',
  indexes: [
    { fields: ['sessionId'], unique: true },
    { fields: ['expiresAt'] },
    { fields: ['isActive'] },
    { fields: ['lastActivity'] }
  ]
});

// Instance methods
GuestSession.prototype.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

GuestSession.prototype.calculateCompleteness = function() {
  let score = 0;
  const maxScore = 100;
  
  // Basic information (40%)
  if (this.skinType) score += 20;
  if (this.skinConcerns && this.skinConcerns.length > 0) score += 20;
  
  // Preferences (30%)
  if (this.knownSensitivities && this.knownSensitivities.length > 0) score += 10;
  if (this.routineComplexity) score += 10;
  if (this.budgetRange && this.budgetRange.max > 0) score += 10;
  
  // Advanced (30%)
  if (this.avoidedIngredients && this.avoidedIngredients.length > 0) score += 10;
  if (this.preferredIngredients && this.preferredIngredients.length > 0) score += 10;
  if (this.quizResponses && this.quizResponses.length > 0) score += 10;
  
  this.profileCompleteness = score;
  return score;
};

GuestSession.prototype.getProductFilters = function() {
  const filters = {};
  
  // Skin type filter
  if (this.skinType) {
    filters.suitableForSkinTypes = this.skinType;
  }
  
  // Concerns filter
  if (this.skinConcerns && this.skinConcerns.length > 0) {
    filters.addressesConcerns = this.skinConcerns;
  }
  
  // Formulation preferences
  const formulationFilters = {};
  if (this.knownSensitivities && this.knownSensitivities.includes('fragrance')) {
    formulationFilters.fragranceFree = true;
  }
  if (this.knownSensitivities && this.knownSensitivities.includes('alcohol')) {
    formulationFilters.alcoholFree = true;
  }
  if (this.knownSensitivities && this.knownSensitivities.includes('silicone')) {
    formulationFilters.siliconeFree = true;
  }
  if (this.knownSensitivities && this.knownSensitivities.includes('sulfates')) {
    formulationFilters.sulfateFree = true;
  }
  if (this.knownSensitivities && this.knownSensitivities.includes('parabens')) {
    formulationFilters.parabenFree = true;
  }
  
  return { ...filters, ...formulationFilters };
};

GuestSession.prototype.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Static methods
GuestSession.cleanupExpired = async function() {
  const expiredSessions = await GuestSession.destroy({
    where: {
      expiresAt: {
        [require('sequelize').Op.lt]: new Date()
      }
    }
  });
  return expiredSessions;
};

module.exports = GuestSession;
