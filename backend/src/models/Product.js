const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productUrl: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false
  },
  productType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  howToUse: {
    type: DataTypes.TEXT
  },
  ingredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  imageUrls: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  localImagePath: {
    type: DataTypes.STRING
  },
  regularPrice: {
    type: DataTypes.DECIMAL(10, 2)
  },
  salePrice: {
    type: DataTypes.DECIMAL(10, 2)
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    validate: {
      min: 0,
      max: 5
    }
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  bpomNumber: {
    type: DataTypes.STRING
  },
  mainCategory: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING
  },
  categorizationConfidence: {
    type: DataTypes.INTEGER
  },
  keyIngredients: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  
  // Formulation traits
  alcoholFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fragranceFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  parabenFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sulfateFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  siliconeFree: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fungalAcneFree: {
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
  
  // Analytics
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  favoriteCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Metadata
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'products',
  indexes: [
    { fields: ['productName'] },
    { fields: ['brand'] },
    { fields: ['mainCategory'] },
    { fields: ['subcategory'] },
    { fields: ['keyIngredients'], using: 'gin' },
    { fields: ['suitableForSkinTypes'], using: 'gin' },
    { fields: ['addressesConcerns'], using: 'gin' },
    { fields: ['rating'] },
    { fields: ['viewCount'] },
    { fields: ['favoriteCount'] },
    { 
      name: 'products_search_idx',
      fields: ['productName', 'brand', 'description'],
      using: 'gin',
      operator: 'gin_trgm_ops'
    }
  ]
});

// Virtual fields
Product.prototype.getCurrentPrice = function() {
  return this.salePrice || this.regularPrice;
};

Product.prototype.hasDiscount = function() {
  return this.salePrice && this.regularPrice && this.salePrice < this.regularPrice;
};

// Instance methods
Product.prototype.calculateMatchScore = function(userProfile) {
  let score = 0;
  const reasons = [];
  
  // Skin type match (30% weight)
  if (this.suitableForSkinTypes && this.suitableForSkinTypes.includes(userProfile.skinType)) {
    score += 30;
    reasons.push(`Perfect for ${userProfile.skinType} skin`);
  }
  
  // Skin concerns match (40% weight)
  if (this.addressesConcerns && userProfile.skinConcerns) {
    const matchingConcerns = this.addressesConcerns.filter(concern =>
      userProfile.skinConcerns.includes(concern)
    );
    if (matchingConcerns.length > 0) {
      score += (matchingConcerns.length / userProfile.skinConcerns.length) * 40;
      reasons.push(`Addresses ${matchingConcerns.join(', ')}`);
    }
  }
  
  // Ingredient preferences/allergies (30% weight)
  if (userProfile.avoidedIngredients) {
    const hasAvoidedIngredients = this.ingredients.some(ingredient =>
      userProfile.avoidedIngredients.some(avoided => 
        ingredient.toLowerCase().includes(avoided.toLowerCase())
      )
    );
    if (!hasAvoidedIngredients) {
      score += 20;
      reasons.push('Free from ingredients you avoid');
    }
  }
  
  if (userProfile.preferredIngredients) {
    const hasPreferredIngredients = this.keyIngredients.some(ingredient =>
      userProfile.preferredIngredients.includes(ingredient)
    );
    if (hasPreferredIngredients) {
      score += 10;
      reasons.push('Contains ingredients you prefer');
    }
  }
  
  return {
    score: Math.min(100, Math.round(score)),
    reasons
  };
};

module.exports = Product;