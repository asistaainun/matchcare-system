const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  skinType: {
    type: DataTypes.ENUM('normal', 'dry', 'oily', 'combination', 'sensitive'),
    allowNull: false
  },
  skinConcerns: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidConcerns(value) {
        const validConcerns = [
          'acne', 'wrinkles', 'fine_lines', 'sensitivity', 'dryness',
          'oiliness', 'redness', 'pores', 'dullness', 'texture',
          'dark_undereyes', 'fungal_acne', 'eczema', 'dark_spots'
        ];
        if (value && !value.every(concern => validConcerns.includes(concern))) {
          throw new Error('Invalid skin concern provided');
        }
      }
    }
  },
  knownSensitivities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidSensitivities(value) {
        const validSensitivities = ['fragrance', 'alcohol', 'silicone', 'sulfates', 'parabens', 'none'];
        if (value && !value.every(sensitivity => validSensitivities.includes(sensitivity))) {
          throw new Error('Invalid sensitivity provided');
        }
      }
    }
  },
  avoidedIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  preferredIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  routineComplexity: {
    type: DataTypes.ENUM('minimal', 'moderate', 'extensive'),
    defaultValue: 'moderate'
  },
  budgetRange: {
    type: DataTypes.JSONB,
    defaultValue: { min: 0, max: 100 },
    validate: {
      isValidBudget(value) {
        if (value && (typeof value.min !== 'number' || typeof value.max !== 'number' || value.min > value.max)) {
          throw new Error('Invalid budget range');
        }
      }
    }
  },
  preferredBrands: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  preferredCategories: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
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
  currentRoutine: {
    type: DataTypes.JSONB,
    defaultValue: {
      morning: [],
      evening: []
    }
  },
  profileCompleteness: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  lastQuizDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  profileVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
}, {
  tableName: 'user_profiles',
  indexes: [
    { fields: ['userId'] },
    { fields: ['skinType'] },
    { fields: ['skinConcerns'], using: 'gin' },
    { fields: ['profileCompleteness'] }
  ]
});

// Instance methods
UserProfile.prototype.calculateCompleteness = function() {
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
  if (this.currentRoutine && (this.currentRoutine.morning.length > 0 || this.currentRoutine.evening.length > 0)) score += 10;
  
  this.profileCompleteness = score;
  return score;
};

UserProfile.prototype.getProductFilters = function() {
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
  
  return { ...filters, ...formulationFilters };
};

module.exports = UserProfile;
