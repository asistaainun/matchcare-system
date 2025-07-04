const csvtojson = require('csvtojson');
const path = require('path');
const fs = require('fs').promises;
const { Product, Ingredient } = require('../models');
const ontologyService = require('./ontologyService');
const { Op } = require('sequelize');

class DataImportService {
  constructor() {
    this.productsFile = path.join(__dirname, '../../data/csv/final_corrected_matchcare_data.csv');
    this.ingredientsFile = path.join(__dirname, '../../data/csv/matchcare_ultimate_cleaned.csv');
    this.imageBasePath = path.join(__dirname, '../../public/images/products');
  }

  async importProducts() {
    try {
      console.log('🚀 Starting product import...');
      
      const jsonArray = await csvtojson().fromFile(this.productsFile);
      console.log(`📦 Found ${jsonArray.length} products to import`);

      let importedCount = 0;
      let skippedCount = 0;
      let imageIssueCount = 0;

      for (const row of jsonArray) {
        try {
          // Check if product already exists
          const existingProduct = await Product.findOne({ 
            where: {
              productName: row['Product Name'],
              brand: row['Brand']
            }
          });

          if (existingProduct) {
            skippedCount++;
            continue;
          }

          // Parse and validate ingredients
          const ingredients = this.parseIngredients(row['Ingredients']);
          const keyIngredients = this.parseKeyIngredients(row['Key_Ingredients']);

          // Handle image paths with validation
          const imageInfo = await this.processImagePaths(row['Image URLs'], row['Local Image Path']);
          if (!imageInfo.hasValidImage) {
            imageIssueCount++;
          }

          // Create product object with enhanced data
          const productData = {
            productUrl: row['Product URL'] || '',
            productName: row['Product Name'] || '',
            brand: row['Brand'] || '',
            productType: row['Product Type'] || '',
            description: row['Description'] || '',
            howToUse: row['How to Use'] || '',
            ingredients: ingredients,
            imageUrls: imageInfo.urls,
            localImagePath: imageInfo.localPath,
            bpomNumber: row['BPOM Number'] || '',
            mainCategory: row['Main_Category'] || '',
            subcategory: row['Subcategory'] || '',
            categorizationConfidence: parseInt(row['Categorization_Confidence']) || 0,
            keyIngredients: keyIngredients,
            
            // Parse formulation traits with validation
            alcoholFree: this.parseBoolean(row['alcohol_free']),
            fragranceFree: this.parseBoolean(row['fragrance_free']),
            parabenFree: this.parseBoolean(row['paraben_free']),
            sulfateFree: this.parseBoolean(row['sulfate_free']),
            siliconeFree: this.parseBoolean(row['silicone_free']),
            
            // Generate missing fields
            fungalAcneFree: this.detectFungalAcneSafety(ingredients),
            
            // Initialize analytics fields
            viewCount: 0,
            favoriteCount: 0,
            rating: 0,
            reviewCount: 0,
            
            // Status
            isActive: true
          };

          // Enhance with ontology data if available
          try {
            await this.enhanceProductWithOntology(productData);
          } catch (ontologyError) {
            console.log(`⚠️  Ontology enhancement skipped for ${productData.productName}: ${ontologyError.message}`);
          }

          await Product.create(productData);
          importedCount++;

          if (importedCount % 100 === 0) {
            console.log(`✅ Imported ${importedCount} products...`);
          }

        } catch (error) {
          console.error(`❌ Error importing product ${row['Product Name']}:`, error.message);
          skippedCount++;
        }
      }

      console.log(`🎉 Product import completed:`);
      console.log(`   ✅ Imported: ${importedCount}`);
      console.log(`   ⏭️  Skipped: ${skippedCount}`);
      console.log(`   ⚠️  Image issues: ${imageIssueCount}`);

      return { 
        imported: importedCount, 
        skipped: skippedCount, 
        imageIssues: imageIssueCount 
      };

    } catch (error) {
      console.error('❌ Error importing products:', error);
      throw error;
    }
  }

  async importIngredients() {
    try {
      console.log('🧪 Starting ingredient import...');
      
      const jsonArray = await csvtojson().fromFile(this.ingredientsFile);
      console.log(`📦 Found ${jsonArray.length} ingredients to import`);

      let importedCount = 0;
      let skippedCount = 0;

      for (const row of jsonArray) {
        try {
          // Check if ingredient already exists
          const existingIngredient = await Ingredient.findOne({ 
            where: { name: row['name'] }
          });

          if (existingIngredient) {
            skippedCount++;
            continue;
          }

          // Create ingredient object with enhanced parsing
          const ingredientData = {
            originalId: parseInt(row['id']) || null,
            name: row['name'] || '',
            productCount: parseInt(row['productCount']) || 0,
            actualFunctions: this.parseArray(row['actualFunctions']),
            embeddedFunctions: this.parseArray(row['embeddedFunctions']),
            functionalCategories: this.parseArray(row['functionalCategories']),
            keyIngredientTypes: this.parseArray(row['keyIngredientTypes']),
            isKeyIngredient: this.parseBoolean(row['isKeyIngredient']),
            suitableForSkinTypes: this.parseArray(row['suitableForSkinTypes']),
            addressesConcerns: this.parseArray(row['addressesConcerns']),
            providedBenefits: this.parseArray(row['providedBenefits']),
            usageInstructions: row['usageInstructions'] || '',
            pregnancySafe: this.parseBoolean(row['pregnancySafe']),
            sensitivities: this.parseArray(row['sensitivities']),
            alcoholFree: this.parseBoolean(row['alcoholFree']),
            fragranceFree: this.parseBoolean(row['fragranceFree']),
            siliconeFree: this.parseBoolean(row['siliconeFree']),
            sulfateFree: this.parseBoolean(row['sulfateFree']),
            parabenFree: this.parseBoolean(row['parabenFree']),
            explanation: row['explanation'] || '',
            benefit: row['benefit'] || '',
            safety: row['safety'] || '',
            alternativeNames: this.parseArray(row['alternativeNames']),
            whatItDoes: this.parseArray(row['whatItDoes']),
            url: row['url'] || '',
            hasDetailedInfo: this.parseBoolean(row['hasDetailedInfo']),
            isMultifunctional: this.parseBoolean(row['isMultifunctional']),
            hasComprehensiveData: this.parseBoolean(row['hasComprehensiveData']),
            concentrationGuidelines: row['concentrationGuidelines'] || '',
            interactionWarnings: this.parseArray(row['interactionWarnings']),
            seasonalUsage: row['seasonalUsage'] || '',
            skinTypeNotes: row['skinTypeNotes'] || '',
            
            // Generate analytics fields
            searchCount: 0,
            popularityScore: 0,
            isActive: true
          };

          // Calculate popularity score
          ingredientData.popularityScore = this.calculatePopularityScore(ingredientData);

          // Enhance with ontology data if available
          try {
            await this.enhanceIngredientWithOntology(ingredientData);
          } catch (ontologyError) {
            console.log(`⚠️  Ontology enhancement skipped for ${ingredientData.name}: ${ontologyError.message}`);
          }

          await Ingredient.create(ingredientData);
          importedCount++;

          if (importedCount % 500 === 0) {
            console.log(`✅ Imported ${importedCount} ingredients...`);
          }

        } catch (error) {
          console.error(`❌ Error importing ingredient ${row['name']}:`, error.message);
          skippedCount++;
        }
      }

      console.log(`🎉 Ingredient import completed: ${importedCount} imported, ${skippedCount} skipped`);
      return { imported: importedCount, skipped: skippedCount };

    } catch (error) {
      console.error('❌ Error importing ingredients:', error);
      throw error;
    }
  }

  // Image processing with validation
  async processImagePaths(imageUrls, localImagePath) {
    const result = {
      urls: [],
      localPath: null,
      hasValidImage: false
    };

    // Process external URLs
    if (imageUrls && imageUrls.trim()) {
      result.urls = imageUrls.split(',').map(url => url.trim()).filter(url => url.length > 0);
      if (result.urls.length > 0) {
        result.hasValidImage = true;
      }
    }

    // Process local image path
    if (localImagePath && localImagePath.trim()) {
      const cleanPath = localImagePath.trim();
      
      // Convert to standard format: /images/products/filename.jpg
      let standardPath;
      if (cleanPath.startsWith('/')) {
        standardPath = cleanPath;
      } else if (cleanPath.includes('images/product')) {
        // Handle path like "assets/images/product/filename.jpg" -> "/images/products/filename.jpg"
        const filename = path.basename(cleanPath);
        standardPath = `/images/products/${filename}`;
      } else {
        // Assume it's just a filename
        standardPath = `/images/products/${cleanPath}`;
      }

      result.localPath = standardPath;

      // Check if file exists
      try {
        const fullPath = path.join(this.imageBasePath, path.basename(standardPath));
        await fs.access(fullPath);
        result.hasValidImage = true;
      } catch (error) {
        console.log(`⚠️  Image not found: ${fullPath}`);
        // Keep the path anyway, might be available later
      }
    }

    return result;
  }

  // Fungal acne safety detection
  detectFungalAcneSafety(ingredients) {
    if (!ingredients || ingredients.length === 0) return false;
    
    const fungalTriggers = [
      'cetearyl alcohol', 'cetyl alcohol', 'stearyl alcohol',
      'lauric acid', 'myristic acid', 'palmitic acid', 
      'stearic acid', 'oleic acid', 'linoleic acid',
      'coconut oil', 'palm oil', 'isopropyl myristate',
      'isopropyl palmitate', 'glyceryl stearate'
    ];

    const ingredientList = ingredients.map(ing => ing.toLowerCase());
    
    return !fungalTriggers.some(trigger => 
      ingredientList.some(ingredient => ingredient.includes(trigger))
    );
  }

  // Enhanced boolean parsing
  parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return false;
  }

  // Enhanced array parsing
  parseArray(arrayString) {
    if (!arrayString || arrayString === 'null' || arrayString === 'undefined' || arrayString === '') {
      return [];
    }
    
    try {
      // Handle JSON array format
      if (arrayString.startsWith('[') && arrayString.endsWith(']')) {
        const parsed = JSON.parse(arrayString);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      // Handle comma-separated format
      return arrayString
        .split(',')
        .map(item => item.trim().replace(/^["']|["']$/g, ''))
        .filter(item => item.length > 0);
    } catch (error) {
      console.error('Error parsing array:', arrayString, error);
      return [];
    }
  }

  // Enhanced ingredient parsing
  parseIngredients(ingredientString) {
    if (!ingredientString || ingredientString.trim() === '') return [];
    
    return ingredientString
      .split(',')
      .map(ingredient => ingredient.trim())
      .filter(ingredient => ingredient.length > 0)
      .map(ingredient => {
        // Clean up common formatting issues
        return ingredient
          .replace(/^\d+\.?\s*/, '') // Remove leading numbers
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      })
      .filter(ingredient => ingredient.length > 0);
  }

  parseKeyIngredients(keyIngredientString) {
    return this.parseIngredients(keyIngredientString);
  }

  // Calculate popularity score for ingredients
  calculatePopularityScore(ingredientData) {
    let score = 0;
    
    // Base score from product count
    score += Math.min(50, (ingredientData.productCount || 0) * 0.5);
    
    // Bonus for key ingredients
    if (ingredientData.isKeyIngredient) score += 20;
    
    // Bonus for multi-functional ingredients
    if (ingredientData.isMultifunctional) score += 10;
    
    // Bonus for comprehensive data
    if (ingredientData.hasComprehensiveData) score += 10;
    
    // Bonus for addressing multiple concerns
    if (ingredientData.addressesConcerns && ingredientData.addressesConcerns.length > 2) {
      score += 10;
    }
    
    return Math.min(100, Math.round(score));
  }

  // Ontology enhancement methods (same as before but with error handling)
  async enhanceProductWithOntology(productData) {
    try {
      if (!ontologyService.isLoaded()) {
        return;
      }

      const ontologySkinTypes = ontologyService.getSuitableSkinTypesForProduct(productData.mainCategory);
      const ontologyConcerns = ontologyService.getConcernsForProduct(productData.mainCategory);
      const ontologyBenefits = ontologyService.getBenefitsForProduct(productData.mainCategory);

      productData.suitableForSkinTypes = [...new Set([
        ...(productData.suitableForSkinTypes || []),
        ...ontologySkinTypes
      ])];

      productData.addressesConcerns = [...new Set([
        ...(productData.addressesConcerns || []),
        ...ontologyConcerns
      ])];

      productData.providedBenefits = [...new Set([
        ...(productData.providedBenefits || []),
        ...ontologyBenefits
      ])];

    } catch (error) {
      console.error('Error enhancing product with ontology:', error);
    }
  }

  async enhanceIngredientWithOntology(ingredientData) {
    try {
      if (!ontologyService.isLoaded()) {
        return;
      }

      const functions = ontologyService.getIngredientFunctions(ingredientData.name);
      const suitableSkinTypes = ontologyService.getSuitableSkinTypes(ingredientData.name);
      const treatedConcerns = ontologyService.getTreatedConcerns(ingredientData.name);
      const benefits = ontologyService.getIngredientBenefits(ingredientData.name);

      ingredientData.actualFunctions = [...new Set([
        ...(ingredientData.actualFunctions || []),
        ...functions
      ])];

      ingredientData.suitableForSkinTypes = [...new Set([
        ...(ingredientData.suitableForSkinTypes || []),
        ...suitableSkinTypes
      ])];

      ingredientData.addressesConcerns = [...new Set([
        ...(ingredientData.addressesConcerns || []),
        ...treatedConcerns
      ])];

      ingredientData.providedBenefits = [...new Set([
        ...(ingredientData.providedBenefits || []),
        ...benefits
      ])];

    } catch (error) {
      console.error('Error enhancing ingredient with ontology:', error);
    }
  }

  async importAll() {
    try {
      console.log('🚀 Starting complete MatchCare data import...');
      
      // Ensure image directory exists
      await this.ensureImageDirectory();
      
      // Load ontology first (optional)
      try {
        if (!ontologyService.isLoaded()) {
          await ontologyService.loadOntology();
          console.log('✅ Ontology loaded successfully');
        }
      } catch (error) {
        console.log('⚠️  Ontology loading skipped:', error.message);
      }

      console.log('\n📦 Phase 1: Importing ingredients...');
      const ingredientResults = await this.importIngredients();
      
      console.log('\n📦 Phase 2: Importing products...');
      const productResults = await this.importProducts();

      console.log('\n🎉 Complete data import finished!');
      console.log('📊 Import Summary:');
      console.log(`   Ingredients: ${ingredientResults.imported} imported, ${ingredientResults.skipped} skipped`);
      console.log(`   Products: ${productResults.imported} imported, ${productResults.skipped} skipped`);
      if (productResults.imageIssues > 0) {
        console.log(`   ⚠️  Image issues: ${productResults.imageIssues} products have missing images`);
      }

      return {
        ingredients: ingredientResults,
        products: productResults,
        success: true
      };

    } catch (error) {
      console.error('❌ Error in complete data import:', error);
      throw error;
    }
  }

  async ensureImageDirectory() {
    try {
      await fs.mkdir(this.imageBasePath, { recursive: true });
      console.log(`✅ Image directory ensured: ${this.imageBasePath}`);
    } catch (error) {
      console.error('Error creating image directory:', error);
    }
  }
}

module.exports = new DataImportService();