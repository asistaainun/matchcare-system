const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserFavorite = sequelize.define('UserFavorite', {
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
  }
}, {
  tableName: 'user_favorites',
  indexes: [
    { 
      unique: true,
      fields: ['userId', 'productId'] 
    }
  ]
});

module.exports = UserFavorite;