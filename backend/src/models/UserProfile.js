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
    },
    onDelete: 'CASCADE'
  },
  
  // === SKIN ANALYSIS RESULTS ===
  
  // Primary Skin Type (from quiz)
  skinType: {
    type: DataTypes.ENUM('normal', 'dry', 'oily', 'combination', 'sensitive'),
    allowNull: true,
    validate: {
      isIn: {
        args: [['normal', 'dry', 'oily', 'combination', 'sensitive']],
        msg: 'Invalid skin type'
      }
    }
  },
  
  // Skin Concerns (multiple selection)
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
  
  // Known Allergies/Sensitivities
  knownSensitivities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidSensitivities(value) {
        const validSensitivities = [
          'fragrance', 'alcohol', 'silicone', 'sulfates', 'parabens', 
          'essential_oils', 'lanolin', 'coconut_oil', 'none'
        ];
        if (value && !value.every(sensitivity => validSensitivities.includes(sensitivity))) {
          throw new Error('Invalid sensitivity provided');
        }
      }
    }
  },
  
  // === INGREDIENT PREFERENCES ===
  
  // Ingredients to avoid
  avoidedIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'List of ingredient names or IDs that user wants to avoid'
  },
  
  // Preferred ingredients
  preferredIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'List of ingredient names or IDs that user prefers'
  },
  
  // === ROUTINE PREFERENCES ===
  
  // Routine complexity preference
  routineComplexity: {
    type: DataTypes.ENUM('minimal', 'moderate', 'extensive'),
    defaultValue: 'moderate',
    validate: {
      isIn: {
        args: [['minimal', 'moderate', 'extensive']],
        msg: 'Invalid routine complexity'
      }
    }
  },
  
  // Budget range
  budgetRange: {
    type: DataTypes.JSONB,
    defaultValue: { min: 0, max: 500000 }, // IDR
    validate: {
      isValidBudget(value) {
        if (value && (
          typeof value.min !== 'number' || 
          typeof value.max !== 'number' || 
          value.min < 0 ||
          value.max < value.min
        )) {
          throw new Error('Invalid budget range');
        }
      }
    }
  },
  
  // === BRAND AND CATEGORY PREFERENCES ===
  
  // Preferred brands
  preferredBrands: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Preferred product categories
  preferredCategories: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Avoided brands
  avoidedBrands: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // === QUIZ DATA ===
  
  // Complete quiz responses (for future analysis)
  quizResponses: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of quiz question-answer pairs with timestamps'
  },
  
  // Detailed skin analysis results
  skinAnalysis: {
    type: DataTypes.JSONB,
    defaultValue: {
      tZoneOiliness: 3,     // 1-5 scale
      cheekDryness: 3,      // 1-5 scale
      sensitivity: 3,       // 1-5 scale
      acneProneness: 3,     // 1-5 scale
      pigmentationRisk: 3,  // 1-5 scale
      agingConcerns: 3,     // 1-5 scale
      confidenceScore: 85   // Overall confidence in analysis
    },
    validate: {
      isValidAnalysis(value) {
        if (value) {
          const requiredFields = ['tZoneOiliness', 'cheekDryness', 'sensitivity', 'acneProneness'];
          const hasRequired = requiredFields.every(field => 
            value[field] !== undefined && 
            value[field] >= 1 && 
            value[field] <= 5
          );
          if (!hasRequired) {
            throw new Error('Invalid skin analysis data');
          }
        }
      }
    }
  },
  
  // === CURRENT ROUTINE ===
  
  // Current skincare routine
  currentRoutine: {
    type: DataTypes.JSONB,
    defaultValue: {
      morning: [],
      evening: [],
      weekly: [],
      notes: ''
    }
  },
  
  // === PROFILE METADATA ===
  
  // Profile completeness percentage
  profileCompleteness: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Last quiz completion date
  lastQuizDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Profile version (for migrations)
  profileVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  
  // === TRACKING AND ANALYTICS ===
  
  // Recommendation tracking
  recommendationStats: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalGenerated: 0,
      lastGenerated: null,
      favoriteCategories: [],
      avgMatchScore: 0
    }
  },
  
  // Profile update history
  updateHistory: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Track when and what was updated in profile'
  }
  
}, {
  tableName: 'user_profiles',
  timestamps: true,
  paranoid: true,
  
  indexes: [
    {
      fields: ['userId'],
      unique: true
    },
    {
      fields: ['skinType']
    },
    {
      fields: ['skinConcerns'],
      using: 'gin'
    },
    {
      fields: ['profileCompleteness']
    },
    {
      fields: ['lastQuizDate']
    },
    {
      fields: ['routineComplexity']
    },
    {
      fields: ['avoidedIngredients'],
      using: 'gin'
    },
    {
      fields: ['preferredIngredients'],
      using: 'gin'
    }
  ],
  
  hooks: {
    beforeSave: async (profile) => {
      // Update profile completeness
      profile.calculateCompleteness();
      
      // Add to update history
      if (!profile.isNewRecord) {
        const history = profile.updateHistory || [];
        history.push({
          timestamp: new Date(),
          changes: profile.changed(),
          version: profile.profileVersion
        });
        
        // Keep only last 20 updates
        if (history.length > 20) {
          history.splice(0, history.length - 20);
        }
        
        profile.updateHistory = history;
      }
    }
  }
});

// === INSTANCE METHODS ===

// Calculate profile completeness
UserProfile.prototype.calculateCompleteness = function() {
  let score = 0;
  const maxScore = 100;
  
  // Basic skin type (25%)
  if (this.skinType) score += 25;
  
  // Skin concerns (20%)
  if (this.skinConcerns && this.skinConcerns.length > 0) score += 20;
  
  // Sensitivities (15%)
  if (this.knownSensitivities && this.knownSensitivities.length > 0) score += 15;
  
  // Routine preferences (15%)
  if (this.routineComplexity) score += 10;
  if (this.budgetRange && this.budgetRange.max > 0) score += 5;
  
  // Ingredient preferences (15%)
  if (this.avoidedIngredients && this.avoidedIngredients.length > 0) score += 7;
  if (this.preferredIngredients && this.preferredIngredients.length > 0) score += 8;
  
  // Current routine (10%)
  if (this.currentRoutine && 
      (this.currentRoutine.morning.length > 0 || this.currentRoutine.evening.length > 0)) {
    score += 10;
  }
  
  this.profileCompleteness = Math.min(score, maxScore);
  return this.profileCompleteness;
};

// Get product filters based on profile
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
  
  // Budget filter
  if (this.budgetRange) {
    filters.minPrice = this.budgetRange.min;
    filters.maxPrice = this.budgetRange.max;
  }
  
  // Brand filters
  if (this.preferredBrands && this.preferredBrands.length > 0) {
    filters.preferredBrands = this.preferredBrands;
  }
  
  if (this.avoidedBrands && this.avoidedBrands.length > 0) {
    filters.avoidedBrands = this.avoidedBrands;
  }
  
  // Formulation preferences based on sensitivities
  const formulationFilters = {};
  if (this.knownSensitivities) {
    if (this.knownSensitivities.includes('fragrance')) {
      formulationFilters.fragranceFree = true;
    }
    if (this.knownSensitivities.includes('alcohol')) {
      formulationFilters.alcoholFree = true;
    }
    if (this.knownSensitivities.includes('silicone')) {
      formulationFilters.siliconeFree = true;
    }
    if (this.knownSensitivities.includes('sulfates')) {
      formulationFilters.sulfateFree = true;
    }
    if (this.knownSensitivities.includes('parabens')) {
      formulationFilters.parabenFree = true;
    }
  }
  
  return { ...filters, ...formulationFilters };
};

// Get skin analysis summary
UserProfile.prototype.getSkinAnalysisSummary = function() {
  if (!this.skinAnalysis) return null;
  
  const analysis = this.skinAnalysis;
  
  return {
    skinType: this.skinType,
    oilinessLevel: analysis.tZoneOiliness || 3,
    drynessLevel: analysis.cheekDryness || 3,
    sensitivityLevel: analysis.sensitivity || 3,
    acnePronenessLevel: analysis.acneProneness || 3,
    confidenceScore: analysis.confidenceScore || 85,
    primaryConcerns: this.skinConcerns?.slice(0, 3) || [],
    recommendationNotes: this.generateRecommendationNotes()
  };
};

// Generate recommendation notes
UserProfile.prototype.generateRecommendationNotes = function() {
  const notes = [];
  
  if (this.skinType === 'sensitive') {
    notes.push('Look for gentle, fragrance-free formulations');
  }
  
  if (this.skinConcerns?.includes('acne')) {
    notes.push('Consider products with salicylic acid or benzoyl peroxide');
  }
  
  if (this.skinConcerns?.includes('aging') || this.skinConcerns?.includes('wrinkles')) {
    notes.push('Retinoids and peptides may be beneficial');
  }
  
  if (this.knownSensitivities?.length > 0) {
    notes.push(`Avoid: ${this.knownSensitivities.join(', ')}`);
  }
  
  return notes;
};

// Update recommendation stats
UserProfile.prototype.updateRecommendationStats = function(matchScore, category) {
  const stats = this.recommendationStats || {};
  
  stats.totalGenerated = (stats.totalGenerated || 0) + 1;
  stats.lastGenerated = new Date();
  
  // Update average match score
  if (matchScore) {
    stats.avgMatchScore = stats.avgMatchScore || 0;
    stats.avgMatchScore = ((stats.avgMatchScore * (stats.totalGenerated - 1)) + matchScore) / stats.totalGenerated;
  }
  
  // Track favorite categories
  if (category) {
    stats.favoriteCategories = stats.favoriteCategories || [];
    const categoryIndex = stats.favoriteCategories.findIndex(c => c.name === category);
    
    if (categoryIndex >= 0) {
      stats.favoriteCategories[categoryIndex].count++;
    } else {
      stats.favoriteCategories.push({ name: category, count: 1 });
    }
    
    // Sort by count and keep top 10
    stats.favoriteCategories.sort((a, b) => b.count - a.count);
    stats.favoriteCategories = stats.favoriteCategories.slice(0, 10);
  }
  
  this.recommendationStats = stats;
  return this.save();
};

// Check if profile needs update
UserProfile.prototype.needsUpdate = function() {
  if (!this.lastQuizDate) return true;
  
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 90); // 3 months
  
  return this.lastQuizDate < threeDaysAgo;
};

// === STATIC METHODS ===

UserProfile.findByUserId = async function(userId) {
  return this.findOne({
    where: { userId },
    include: [{
      model: require('./User'),
      as: 'user',
      attributes: ['id', 'firstName', 'lastName', 'email']
    }]
  });
};

UserProfile.getCompletionStats = async function() {
  const { Op } = require('sequelize');
  
  const stats = await this.findAll({
    attributes: [
      [sequelize.fn('AVG', sequelize.col('profile_completeness')), 'avgCompleteness'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN profile_completeness >= 80 THEN 1 END')), 'completeProfiles'],
      [sequelize.fn('COUNT', '*'), 'totalProfiles']
    ],
    raw: true
  });
  
  return stats[0];
};

UserProfile.getSkinTypeDistribution = async function() {
  return this.findAll({
    attributes: [
      'skinType',
      [sequelize.fn('COUNT', '*'), 'count']
    ],
    where: {
      skinType: { [Op.ne]: null }
    },
    group: ['skinType'],
    raw: true
  });
};

module.exports = UserProfile;