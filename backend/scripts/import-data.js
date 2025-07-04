const { connectDB } = require('../src/config/database');
const dataImportService = require('../src/services/dataImportService');
const ontologyService = require('../src/services/ontologyService');
require('dotenv').config();

async function importData() {
  try {
    console.log('🚀 Starting MatchCare data import process...');
    
    // Connect to database
    await connectDB();
    console.log('✅ PostgreSQL connected');

    // Load ontology
    console.log('📚 Loading ontology...');
    await ontologyService.loadOntology();
    console.log('✅ Ontology loaded');

    // Import data
    console.log('📦 Starting data import...');
    const results = await dataImportService.importAll();
    
    console.log('🎉 Data import completed successfully!');
    console.log('📊 Import Summary:');
    console.log(`   Ingredients: ${results.ingredients.imported} imported, ${results.ingredients.skipped} skipped`);
    console.log(`   Products: ${results.products.imported} imported, ${results.products.skipped} skipped`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during data import:', error);
    process.exit(1);
  }
}

// Run import if called directly
if (require.main === module) {
  importData();
}

module.exports = importData;