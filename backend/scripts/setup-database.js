const { sequelize } = require('../src/config/database');
const models = require('../src/models');
require('dotenv').config();

async function setupDatabase() {
  try {
    console.log('🚀 Starting MatchCare PostgreSQL database setup...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');

    // Create/sync all tables
    console.log('📊 Creating database tables...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ Database tables created/updated');

    // Add PostgreSQL extensions
    console.log('🔧 Adding PostgreSQL extensions...');
    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
      console.log('✅ PostgreSQL extensions added');
    } catch (error) {
      console.log('⚠️  Extension setup (may require superuser):', error.message);
    }

    // Create indexes
    console.log('🔍 Creating database indexes...');
    await createIndexes();
    console.log('✅ Database indexes created');

    console.log('🎉 Database setup completed successfully!');
    console.log('💡 You can now run: npm run import-data');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during database setup:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  const queries = [
    // Products indexes
    'CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector(\'english\', product_name || \' \' || brand || \' \' || description))',
    'CREATE INDEX IF NOT EXISTS idx_products_main_category ON products(main_category)',
    'CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)',
    'CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating DESC)',
    'CREATE INDEX IF NOT EXISTS idx_products_view_count ON products(view_count DESC)',
    'CREATE INDEX IF NOT EXISTS idx_products_suitable_skin_types ON products USING gin(suitable_for_skin_types)',
    'CREATE INDEX IF NOT EXISTS idx_products_addresses_concerns ON products USING gin(addresses_concerns)',
    'CREATE INDEX IF NOT EXISTS idx_products_key_ingredients ON products USING gin(key_ingredients)',
    
    // Ingredients indexes  
    'CREATE INDEX IF NOT EXISTS idx_ingredients_name_search ON ingredients USING gin(to_tsvector(\'english\', name || \' \' || coalesce(explanation, \'\')))',
    'CREATE INDEX IF NOT EXISTS idx_ingredients_functional_categories ON ingredients USING gin(functional_categories)',
    'CREATE INDEX IF NOT EXISTS idx_ingredients_suitable_skin_types ON ingredients USING gin(suitable_for_skin_types)',
    'CREATE INDEX IF NOT EXISTS idx_ingredients_addresses_concerns ON ingredients USING gin(addresses_concerns)',
    'CREATE INDEX IF NOT EXISTS idx_ingredients_popularity ON ingredients(popularity_score DESC)',
    'CREATE INDEX IF NOT EXISTS idx_ingredients_key ON ingredients(is_key_ingredient)',
    
    // User profiles indexes
    'CREATE INDEX IF NOT EXISTS idx_user_profiles_skin_type ON user_profiles(skin_type)',
    'CREATE INDEX IF NOT EXISTS idx_user_profiles_skin_concerns ON user_profiles USING gin(skin_concerns)',
    'CREATE INDEX IF NOT EXISTS idx_user_profiles_completeness ON user_profiles(profile_completeness)',
    
    // Favorites indexes
    'CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_favorites_product ON user_favorites(product_id)',
    
    // Match scores indexes
    'CREATE INDEX IF NOT EXISTS idx_match_scores_user ON product_match_scores(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_match_scores_product ON product_match_scores(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_match_scores_score ON product_match_scores(score DESC)'
  ];

  for (const query of queries) {
    try {
      await sequelize.query(query);
    } catch (error) {
      console.log(`⚠️  Index creation warning: ${error.message}`);
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;