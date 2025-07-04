const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductMatchScore = sequelize.define('ProductMatchScore', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'products',
      key: 'id'
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  reasons: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  calculatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'product_match_scores',
  indexes: [
    { 
      unique: true,
      fields: ['userId', 'productId'] 
    },
    { fields: ['score'] }
  ]
});

module.exports = ProductMatchScore;