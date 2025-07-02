const csvtojson = require('csvtojson');
const path = require('path');
const { Product, Ingredient } = require('../models');
const ontologyService = require('./ontologyService');
const { Op } = require('sequelize');

class DataImportService {
  constructor() {
    this.productsFile = path.join(__dirname, '../../data/csv/final_corrected_matchcare_data.csv');
    this.ingredientsFile = path.join(__dirname, '../../data/csv/matchcare_ultimate_cleaned.csv');
  }

  async importProducts() {
    try {
      console.log('Starting product import...');
      
      const jsonArray = await csvtojson().fromFile(this.productsFile);
      console.log(`Found ${jsonArray.length} products to import`);

      let importedCount = 0;
      let skippedCount = 0;

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

          // Parse ingredients list
          const ingredients = this.parseIngredients(row['Ingredients']);
          const keyIngredients = this.parseKeyIngredients(row['Key_Ingredients']);

          // Create product object
          const productData = {
            productUrl: row['Product URL'],
            productName: row['Product Name'],
            brand: row['Brand'],
            productType: row['Product Type'],
            description: row['Description'],
            howToUse: row['How to Use'],
            ingredients: ingredients,
            imageUrls: row['Image URLs'] ? row['Image URLs'].split(',').map(url => url.trim()) : [],
            localImagePath: row['Local Image Path'],
            regularPrice: this.parsePrice(row['Regular Price']),
            salePrice: this.parsePrice(row['Sale Price']),
            rating: parseFloat(row['Rating']) || 0,
            reviewCount: parseInt(row['Review Count']) || 0,
            bpomNumber: row['BPOM Number'],
            mainCategory: row['Main_Category'],
            subcategory: row['Subcategory'],
            categorizationConfidence: parseInt(row['Categorization_Confidence']) || 0,
            keyIngredients: keyIngredients,
            
            // Parse formulation traits
            alcoholFree: row['alcohol_free'] === 'true',
            fragranceFree: row['fragrance_free'] === 'true',
            parabenFree: row['paraben_free'] === 'true',
            sulfateFree: row['sulfate_free'] === 'true',
            siliconeFree: row['silicone_free'] === 'true'
          };

          // Enhance with ontology data
          await this.enhanceProductWithOntology(productData);

          await Product.create(productData);
          importedCount++;

          if (importedCount % 100 === 0) {
            console.log(`Imported ${importedCount} products...`);
          }

        } catch (error) {
          console.error(`Error importing product ${row['Product Name']}:`, error.message);
          skippedCount++;
        }
      }

      console.log(`Product import completed: ${importedCount} imported, ${skippedCount} skipped`);
      return { imported: importedCount, skipped: skippedCount };

    } catch (error) {
      console.error('Error importing products:', error);
      throw error;
    }
  }

  async importIngredients() {
    try {
      console.log('Starting ingredient import...');
      
      const jsonArray = await csvtojson().fromFile(this.ingredientsFile);
      console.log(`Found ${jsonArray.length} ingredients to import`);

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

          // Create ingredient object
          const ingredientData = {
            originalId: parseInt(row['id']),
            name: row['name'],
            productCount: parseInt(row['productCount']) || 0,
            actualFunctions: this.parseArray(row['actualFunctions']),
            embeddedFunctions: this.parseArray(row['embeddedFunctions']),
            functionalCategories: this.parseArray(row['functionalCategories']),
            keyIngredientTypes: this.parseArray(row['keyIngredientTypes']),
            isKeyIngredient: row['isKeyIngredient'] === 'true',
            suitableForSkinTypes: this.parseArray(row['suitableForSkinTypes']),
            addressesConcerns: this.parseArray(row['addressesConcerns']),
            providedBenefits: this.parseArray(row['providedBenefits']),
            usageInstructions: row['usageInstructions'],
            pregnancySafe: row['pregnancySafe'] === 'true',
            sensitivities: this.parseArray(row['sensitivities']),
            alcoholFree: row['alcoholFree'] === 'true',
            fragranceFree: row['fragranceFree'] === 'true',
            siliconeFree: row['siliconeFree'] === 'true',
            sulfateFree: row['sulfateFree'] === 'true',
            parabenFree: row['parabenFree'] === 'true',
            explanation: row['explanation'],
            benefit: row['benefit'],
            safety: row['safety'],
            alternativeNames: this.parseArray(row['alternativeNames']),
            whatItDoes: this.parseArray(row['whatItDoes']),
            url: row['url'],
            hasDetailedInfo: row['hasDetailedInfo'] === 'true',
            isMultifunctional: row['isMultifunctional'] === 'true',
            hasComprehensiveData: row['hasComprehensiveData'] === 'true',
            concentrationGuidelines: row['concentrationGuidelines'],
            interactionWarnings: this.parseArray(row['interactionWarnings']),
            seasonalUsage: row['seasonalUsage'],
            skinTypeNotes: row['skinTypeNotes']
          };

          // Enhance with ontology data
          await this.enhanceIngredientWithOntology(ingredientData);

          await Ingredient.create(ingredientData);
          importedCount++;

          if (importedCount % 500 === 0) {
            console.log(`Imported ${importedCount} ingredients...`);
          }

        } catch (error) {
          console.error(`Error importing ingredient ${row['name']}:`, error.message);
          skippedCount++;
        }
      }

      console.log(`Ingredient import completed: ${importedCount} imported, ${skippedCount} skipped`);
      return { imported: importedCount, skipped: skippedCount };

    } catch (error) {
      console.error('Error importing ingredients:', error);
      throw error;
    }
  }

  async enhanceProductWithOntology(productData) {
    try {
      // Get ontology-based skin types and concerns
      const ontologySkinTypes = ontologyService.getSuitableSkinTypesForProduct(productData.mainCategory);
      const ontologyConcerns = ontologyService.getConcernsForProduct(productData.mainCategory);
      const formationTraits = ontologyService.getFormulationTraits(productData.mainCategory);

      // Merge with existing data
      productData.suitableForSkinTypes = [...new Set([
        ...(productData.suitableForSkinTypes || []),
        ...ontologySkinTypes
      ])];

      productData.addressesConcerns = [...new Set([
        ...(productData.addressesConcerns || []),
        ...ontologyConcerns
      ])];

      // Apply ontology formulation traits
      Object.assign(productData, formationTraits);

    } catch (error) {
      console.error('Error enhancing product with ontology:', error);
    }
  }

  async enhanceIngredientWithOntology(ingredientData) {
    try {
      // Get ontology-based information
      const functions = ontologyService.getIngredientFunctions(ingredientData.name);
      const suitableSkinTypes = ontologyService.getSuitableSkinTypes(ingredientData.name);
      const treatedConcerns = ontologyService.getTreatedConcerns(ingredientData.name);

      // Merge with existing data
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

    } catch (error) {
      console.error('Error enhancing ingredient with ontology:', error);
    }
  }

  parseIngredients(ingredientString) {
    if (!ingredientString) return [];
    return ingredientString
      .split(',')
      .map(ingredient => ingredient.trim())
      .filter(ingredient => ingredient.length > 0);
  }

  parseKeyIngredients(keyIngredientString) {
    if (!keyIngredientString) return [];
    return keyIngredientString
      .split(',')
      .map(ingredient => ingredient.trim())
      .filter(ingredient => ingredient.length > 0);
  }

  parseArray(arrayString) {
    if (!arrayString || arrayString === 'null' || arrayString === 'undefined') return [];
    try {
      // Handle JSON array format
      if (arrayString.startsWith('[') && arrayString.endsWith(']')) {
        return JSON.parse(arrayString);
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

  parsePrice(priceString) {
    if (!priceString || priceString === 'null') return null;
    const price = parseFloat(priceString.toString().replace(/[^0-9.-]+/g, ''));
    return isNaN(price) ? null : price;
  }

  async importAll() {
    try {
      console.log('Starting complete data import...');
      
      // Load ontology first
      if (!ontologyService.ontologyLoaded) {
        await ontologyService.loadOntology();
      }

      // Import ingredients first (products might reference them)
      const ingredientResults = await this.importIngredients();
      
      // Then import products
      const productResults = await this.importProducts();

      console.log('Complete data import finished:');
      console.log(`Ingredients: ${ingredientResults.imported} imported, ${ingredientResults.skipped} skipped`);
      console.log(`Products: ${productResults.imported} imported, ${productResults.skipped} skipped`);

      return {
        ingredients: ingredientResults,
        products: productResults
      };

    } catch (error) {
      console.error('Error in complete data import:', error);
      throw error;
    }
  }
}

module.exports = new DataImportService();