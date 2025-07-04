const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ingredient = sequelize.define('Ingredient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  originalId: {
    type: DataTypes.INTEGER,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  productCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Functional information
  actualFunctions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  embeddedFunctions: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  functionalCategories: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  keyIngredientTypes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  isKeyIngredient: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Skin compatibility
  suitableForSkinTypes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  addressesConcerns: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  providedBenefits: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Usage information
  usageInstructions: {
    type: DataTypes.TEXT
  },
  pregnancySafe: {
    type: DataTypes.BOOLEAN
  },
  sensitivities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Formulation properties
  alcoholFree: {
    type: DataTypes.BOOLEAN
  },
  fragranceFree: {
    type: DataTypes.BOOLEAN
  },
  siliconeFree: {
    type: DataTypes.BOOLEAN
  },
  sulfateFree: {
    type: DataTypes.BOOLEAN
  },
  parabenFree: {
    type: DataTypes.BOOLEAN
  },
  
  // Detailed information
  explanation: {
    type: DataTypes.TEXT
  },
  benefit: {
    type: DataTypes.TEXT
  },
  safety: {
    type: DataTypes.TEXT
  },
  alternativeNames: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  whatItDoes: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  url: {
    type: DataTypes.STRING
  },
  
  // Data quality flags
  hasDetailedInfo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isMultifunctional: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  hasComprehensiveData: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // Advanced properties
  concentrationGuidelines: {
    type: DataTypes.TEXT
  },
  interactionWarnings: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  seasonalUsage: {
    type: DataTypes.STRING
  },
  skinTypeNotes: {
    type: DataTypes.TEXT
  },
  
  // Ontology relationships
  ontologyClass: {
    type: DataTypes.STRING
  },
  parentIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  childIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  synergisticWith: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  incompatibleWith: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Analytics
  searchCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  popularityScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Metadata
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ingredients',
  indexes: [
    { fields: ['name'] },
    { fields: ['originalId'] },
    { fields: ['isKeyIngredient'] },
    { fields: ['functionalCategories'], using: 'gin' },
    { fields: ['suitableForSkinTypes'], using: 'gin' },
    { fields: ['addressesConcerns'], using: 'gin' },
    { fields: ['popularityScore'] },
    { 
      name: 'ingredients_search_idx',
      fields: ['name', 'alternativeNames', 'explanation'],
      using: 'gin',
      operator: 'gin_trgm_ops'
    }
  ]
});

// Instance methods
Ingredient.prototype.getCompatibilityScore = function(userProfile) {
  let score = 0;
  
  // Check if suitable for user's skin type
  if (this.suitableForSkinTypes && this.suitableForSkinTypes.includes(userProfile.skinType)) {
    score += 40;
  }
  
  // Check if addresses user's concerns
  if (this.addressesConcerns && userProfile.skinConcerns) {
    const concernMatches = this.addressesConcerns.filter(concern => 
      userProfile.skinConcerns.includes(concern)
    );
    score += (concernMatches.length / userProfile.skinConcerns.length) * 60;
  }
  
  return Math.min(100, score);
};

module.exports = Ingredient;