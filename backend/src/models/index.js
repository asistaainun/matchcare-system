const { sequelize } = require('../config/database');
const User = require('./User');
const UserProfile = require('./UserProfile');
const Product = require('./Product');
const Ingredient = require('./Ingredient');
const UserFavorite = require('./UserFavorite');
const ProductMatchScore = require('./ProductMatchScore');
const GuestSession = require('./GuestSession');

// Define associations
User.hasOne(UserProfile, { 
  foreignKey: 'userId', 
  as: 'profile',
  onDelete: 'CASCADE'
});
UserProfile.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

// User Favorites (Many-to-Many)
User.belongsToMany(Product, {
  through: UserFavorite,
  foreignKey: 'userId',
  otherKey: 'productId',
  as: 'favoriteProducts'
});
Product.belongsToMany(User, {
  through: UserFavorite,
  foreignKey: 'productId',
  otherKey: 'userId',
  as: 'favoritedByUsers'
});

// Product Match Scores
Product.hasMany(ProductMatchScore, {
  foreignKey: 'productId',
  as: 'matchScores'
});
ProductMatchScore.belongsTo(Product, {
  foreignKey: 'productId'
});
ProductMatchScore.belongsTo(User, {
  foreignKey: 'userId'
});

// Guest Session associations
GuestSession.belongsTo(User, {
  foreignKey: 'convertedToUserId',
  as: 'convertedUser',
  constraints: false
});
User.hasMany(GuestSession, {
  foreignKey: 'convertedToUserId',
  as: 'guestSessions',
  constraints: false
});

const models = {
  User,
  UserProfile,
  Product,
  Ingredient,
  UserFavorite,
  ProductMatchScore,
  GuestSession,
  sequelize
};

module.exports = models;