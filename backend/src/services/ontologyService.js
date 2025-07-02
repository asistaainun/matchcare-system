const { ontologyConfig } = require('../config/ontology');
const logger = require('../config/logger').ontology;
const $rdf = require('rdflib');

class OntologyService {
  constructor() {
    this.store = null;
    this.namespaces = {
      skincare: 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/',
      owl: 'http://www.w3.org/2002/07/owl#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      xsd: 'http://www.w3.org/2001/XMLSchema#'
    };
    this.loaded = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // === INITIALIZATION ===

  async loadOntology() {
    try {
      logger.info('🧠 Loading ontology...');
      
      this.store = await ontologyConfig.loadOntology();
      this.loaded = true;
      
      // Clear cache when ontology is reloaded
      this.cache.clear();
      
      logger.info('✅ Ontology service initialized');
      return true;
    } catch (error) {
      logger.error('❌ Failed to load ontology:', error);
      this.loaded = false;
      throw error;
    }
  }

  isLoaded() {
    return this.loaded && this.store;
  }

  getStats() {
    return ontologyConfig.getStatus();
  }

  // === CACHING UTILITIES ===

  getCacheKey(method, ...args) {
    return `${method}:${args.join(':')}`;
  }

  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // === BASIC ONTOLOGY QUERIES ===

  query(subject, predicate, object) {
    if (!this.isLoaded()) {
      logger.warn('Ontology not loaded, returning empty results');
      return [];
    }

    try {
      return this.store.match(subject, predicate, object);
    } catch (error) {
      logger.error('Error querying ontology:', error);
      return [];
    }
  }

  createNode(uri) {
    return $rdf.sym(uri);
  }

  createNamespacedNode(namespace, localName) {
    return this.createNode(this.namespaces[namespace] + localName);
  }

  // === INGREDIENT ANALYSIS ===

  getIngredientFunctions(ingredientName) {
    const cacheKey = this.getCacheKey('getIngredientFunctions', ingredientName);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    if (!this.isLoaded()) return [];

    try {
      const functions = [];
      
      // Create nodes for querying
      const rdf = $rdf.Namespace(this.namespaces.rdf);
      const skincare = $rdf.Namespace(this.namespaces.skincare);
      
      // Find ingredient by name (case-insensitive matching)
      const ingredients = this.query(null, rdf('type'), skincare('Ingredient'));
      
      for (const stmt of ingredients) {
        const ingredientNode = stmt.subject;
        const labels = this.query(ingredientNode, $rdf.Namespace(this.namespaces.rdfs)('label'), null);
        
        for (const labelStmt of labels) {
          if (labelStmt.object.value.toLowerCase().includes(ingredientName.toLowerCase())) {
            // Get functions for this ingredient
            const functionStatements = this.query(ingredientNode, skincare('hasFunction'), null);
            for (const funcStmt of functionStatements) {
              const functionLabel = this.getLabel(funcStmt.object) || this.getLocalName(funcStmt.object.uri);
              if (functionLabel) {
                functions.push(functionLabel.toLowerCase());
              }
            }
          }
        }
      }

      // Add default functions based on common ingredient names
      const defaultFunctions = this.getDefaultFunctions(ingredientName);
      functions.push(...defaultFunctions);

      const result = [...new Set(functions)]; // Remove duplicates
      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Error getting ingredient functions:', error);
      return [];
    }
  }

  getDefaultFunctions(ingredientName) {
    const name = ingredientName.toLowerCase();
    const functions = [];

    // Map common ingredients to their functions
    const functionMap = {
      'hyaluronic acid': ['humectant', 'hydrating'],
      'niacinamide': ['skin conditioning', 'pore minimizing'],
      'retinol': ['anti-aging', 'cell communicating'],
      'salicylic acid': ['exfoliant', 'anti-acne'],
      'glycolic acid': ['exfoliant', 'brightening'],
      'vitamin c': ['antioxidant', 'brightening'],
      'ceramide': ['skin barrier', 'moisturizing'],
      'zinc oxide': ['uv filter', 'skin protecting'],
      'titanium dioxide': ['uv filter', 'skin protecting'],
      'benzyl alcohol': ['preservative'],
      'phenoxyethanol': ['preservative'],
      'dimethicone': ['emollient', 'film forming'],
      'glycerin': ['humectant', 'moisturizing'],
      'petrolatum': ['occlusive', 'moisturizing']
    };

    for (const [ingredient, funcs] of Object.entries(functionMap)) {
      if (name.includes(ingredient)) {
        functions.push(...funcs);
      }
    }

    return functions;
  }

  getSuitableSkinTypes(ingredientName) {
    const cacheKey = this.getCacheKey('getSuitableSkinTypes', ingredientName);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    if (!this.isLoaded()) {
      return this.getDefaultSuitableSkinTypes(ingredientName);
    }

    try {
      const skinTypes = [];
      
      // Query ontology for skin type compatibility
      const skincare = $rdf.Namespace(this.namespaces.skincare);
      const rdf = $rdf.Namespace(this.namespaces.rdf);
      
      // Find ingredient and its skin type relationships
      const ingredients = this.query(null, rdf('type'), skincare('Ingredient'));
      
      for (const stmt of ingredients) {
        const ingredientNode = stmt.subject;
        const labels = this.query(ingredientNode, $rdf.Namespace(this.namespaces.rdfs)('label'), null);
        
        for (const labelStmt of labels) {
          if (labelStmt.object.value.toLowerCase().includes(ingredientName.toLowerCase())) {
            const suitabilityStatements = this.query(ingredientNode, skincare('recommendedFor'), null);
            for (const suitStmt of suitabilityStatements) {
              const skinTypeLabel = this.getLabel(suitStmt.object) || this.getLocalName(suitStmt.object.uri);
              if (skinTypeLabel) {
                skinTypes.push(skinTypeLabel.toLowerCase());
              }
            }
          }
        }
      }

      // Add default skin types if not found in ontology
      if (skinTypes.length === 0) {
        skinTypes.push(...this.getDefaultSuitableSkinTypes(ingredientName));
      }

      const result = [...new Set(skinTypes)];
      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Error getting suitable skin types:', error);
      return this.getDefaultSuitableSkinTypes(ingredientName);
    }
  }

  getDefaultSuitableSkinTypes(ingredientName) {
    const name = ingredientName.toLowerCase();
    
    // Default skin type mapping based on ingredient properties
    if (name.includes('acid') && (name.includes('salicylic') || name.includes('glycolic'))) {
      return ['oily', 'combination']; // Acids typically for oily skin
    }
    
    if (name.includes('hyaluronic') || name.includes('glycerin')) {
      return ['normal', 'dry', 'combination']; // Humectants for hydration
    }
    
    if (name.includes('niacinamide')) {
      return ['normal', 'oily', 'combination']; // Niacinamide for oil control
    }
    
    if (name.includes('ceramide')) {
      return ['normal', 'dry', 'sensitive']; // Ceramides for barrier repair
    }
    
    if (name.includes('retinol') || name.includes('retinoid')) {
      return ['normal', 'oily']; // Retinoids need gradual introduction
    }
    
    // Default: suitable for most skin types
    return ['normal', 'dry', 'oily', 'combination'];
  }

  getTreatedConcerns(ingredientName) {
    const cacheKey = this.getCacheKey('getTreatedConcerns', ingredientName);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    if (!this.isLoaded()) {
      return this.getDefaultTreatedConcerns(ingredientName);
    }

    try {
      const concerns = [];
      
      const skincare = $rdf.Namespace(this.namespaces.skincare);
      const rdf = $rdf.Namespace(this.namespaces.rdf);
      
      const ingredients = this.query(null, rdf('type'), skincare('Ingredient'));
      
      for (const stmt of ingredients) {
        const ingredientNode = stmt.subject;
        const labels = this.query(ingredientNode, $rdf.Namespace(this.namespaces.rdfs)('label'), null);
        
        for (const labelStmt of labels) {
          if (labelStmt.object.value.toLowerCase().includes(ingredientName.toLowerCase())) {
            const treatStatements = this.query(ingredientNode, skincare('treatsConcern'), null);
            for (const treatStmt of treatStatements) {
              const concernLabel = this.getLabel(treatStmt.object) || this.getLocalName(treatStmt.object.uri);
              if (concernLabel) {
                concerns.push(concernLabel.toLowerCase());
              }
            }
          }
        }
      }

      // Add default concerns if not found in ontology
      if (concerns.length === 0) {
        concerns.push(...this.getDefaultTreatedConcerns(ingredientName));
      }

      const result = [...new Set(concerns)];
      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Error getting treated concerns:', error);
      return this.getDefaultTreatedConcerns(ingredientName);
    }
  }

  getDefaultTreatedConcerns(ingredientName) {
    const name = ingredientName.toLowerCase();
    const concerns = [];

    // Map ingredients to concerns they typically address
    const concernMap = {
      'salicylic acid': ['acne', 'pores', 'oiliness'],
      'glycolic acid': ['fine_lines', 'texture', 'dullness'],
      'lactic acid': ['dryness', 'texture', 'dullness'],
      'hyaluronic acid': ['dryness', 'fine_lines'],
      'niacinamide': ['pores', 'oiliness', 'redness'],
      'retinol': ['wrinkles', 'fine_lines', 'texture'],
      'vitamin c': ['dark_spots', 'dullness'],
      'ceramide': ['dryness', 'sensitivity'],
      'zinc oxide': ['sensitivity', 'redness'],
      'benzoyl peroxide': ['acne']
    };

    for (const [ingredient, concernList] of Object.entries(concernMap)) {
      if (name.includes(ingredient)) {
        concerns.push(...concernList);
      }
    }

    return concerns;
  }

  getIngredientBenefits(ingredientName) {
    const cacheKey = this.getCacheKey('getIngredientBenefits', ingredientName);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const benefits = [];
    const functions = this.getIngredientFunctions(ingredientName);
    const concerns = this.getTreatedConcerns(ingredientName);

    // Map functions to benefits
    const functionBenefitMap = {
      'humectant': ['hydrating'],
      'exfoliant': ['good for texture'],
      'antioxidant': ['brightening', 'helps with anti aging'],
      'anti-acne': ['acne fighter'],
      'moisturizing': ['hydrating'],
      'skin conditioning': ['skin conditioning'],
      'soothing': ['reduces irritation', 'reduces redness']
    };

    functions.forEach(func => {
      if (functionBenefitMap[func]) {
        benefits.push(...functionBenefitMap[func]);
      }
    });

    // Map concerns to benefits
    const concernBenefitMap = {
      'acne': ['acne fighter'],
      'dark_spots': ['helps with dark spots', 'brightening'],
      'wrinkles': ['helps with anti aging'],
      'fine_lines': ['helps with anti aging'],
      'pores': ['reduces large pores'],
      'redness': ['reduces redness'],
      'dryness': ['hydrating']
    };

    concerns.forEach(concern => {
      if (concernBenefitMap[concern]) {
        benefits.push(...concernBenefitMap[concern]);
      }
    });

    const result = [...new Set(benefits)];
    this.setCachedResult(cacheKey, result);
    return result;
  }

  // === PRODUCT ANALYSIS ===

  getSuitableSkinTypesForProduct(category) {
    const cacheKey = this.getCacheKey('getSuitableSkinTypesForProduct', category);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const skinTypes = [];

    // Map categories to suitable skin types
    const categoryMap = {
      'cleanser': ['normal', 'oily', 'combination'],
      'moisturizer': ['normal', 'dry', 'sensitive'],
      'serum': ['normal', 'dry', 'oily', 'combination'],
      'sunscreen': ['normal', 'dry', 'oily', 'combination', 'sensitive'],
      'toner': ['normal', 'oily', 'combination'],
      'exfoliator': ['normal', 'oily', 'combination'],
      'mask': ['normal', 'dry', 'oily', 'combination']
    };

    const categoryLower = category.toLowerCase();
    for (const [cat, types] of Object.entries(categoryMap)) {
      if (categoryLower.includes(cat)) {
        skinTypes.push(...types);
      }
    }

    // Default to all skin types if not found
    if (skinTypes.length === 0) {
      skinTypes.push('normal', 'dry', 'oily', 'combination', 'sensitive');
    }

    const result = [...new Set(skinTypes)];
    this.setCachedResult(cacheKey, result);
    return result;
  }

  getConcernsForProduct(category) {
    const cacheKey = this.getCacheKey('getConcernsForProduct', category);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const concerns = [];

    // Map categories to concerns they typically address
    const categoryMap = {
      'cleanser': ['acne', 'oiliness'],
      'moisturizer': ['dryness', 'sensitivity'],
      'serum': ['wrinkles', 'dark_spots', 'dullness'],
      'sunscreen': ['sensitivity', 'dark_spots'],
      'toner': ['pores', 'oiliness'],
      'exfoliator': ['texture', 'dullness', 'acne'],
      'mask': ['dryness', 'dullness', 'pores']
    };

    const categoryLower = category.toLowerCase();
    for (const [cat, concernList] of Object.entries(categoryMap)) {
      if (categoryLower.includes(cat)) {
        concerns.push(...concernList);
      }
    }

    const result = [...new Set(concerns)];
    this.setCachedResult(cacheKey, result);
    return result;
  }

  getBenefitsForProduct(category) {
    const cacheKey = this.getCacheKey('getBenefitsForProduct', category);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const benefits = [];

    // Map categories to benefits
    const categoryMap = {
      'cleanser': ['acne fighter'],
      'moisturizer': ['hydrating', 'skin conditioning'],
      'serum': ['brightening', 'helps with anti aging'],
      'sunscreen': ['skin conditioning'],
      'toner': ['reduces large pores'],
      'exfoliator': ['good for texture', 'brightening'],
      'mask': ['hydrating', 'good for texture']
    };

    const categoryLower = category.toLowerCase();
    for (const [cat, benefitList] of Object.entries(categoryMap)) {
      if (categoryLower.includes(cat)) {
        benefits.push(...benefitList);
      }
    }

    const result = [...new Set(benefits)];
    this.setCachedResult(cacheKey, result);
    return result;
  }

  // === UTILITY METHODS ===

  getLabel(resource) {
    const rdfs = $rdf.Namespace(this.namespaces.rdfs);
    const labels = this.query(resource, rdfs('label'), null);
    return labels.length > 0 ? labels[0].object.value : null;
  }

  getLocalName(uri) {
    return uri.split(/[#\/]/).pop();
  }

  // === RECOMMENDATION LOGIC ===

  calculateIngredientCompatibility(ingredientName, userProfile) {
    let score = 0;
    const maxScore = 100;

    try {
      // Check skin type compatibility (40%)
      const suitableSkinTypes = this.getSuitableSkinTypes(ingredientName);
      if (suitableSkinTypes.includes(userProfile.skinType)) {
        score += 40;
      }

      // Check concern addressing (40%)
      const treatedConcerns = this.getTreatedConcerns(ingredientName);
      if (userProfile.skinConcerns && userProfile.skinConcerns.length > 0) {
        const matchingConcerns = treatedConcerns.filter(concern =>
          userProfile.skinConcerns.includes(concern)
        );
        score += (matchingConcerns.length / userProfile.skinConcerns.length) * 40;
      }

      // User preferences (20%)
      if (userProfile.preferredIngredients && 
          userProfile.preferredIngredients.includes(ingredientName)) {
        score += 20;
      }

      // Penalty for avoided ingredients
      if (userProfile.avoidedIngredients && 
          userProfile.avoidedIngredients.includes(ingredientName)) {
        score = 0;
      }

      return Math.min(maxScore, Math.round(score));

    } catch (error) {
      logger.error('Error calculating ingredient compatibility:', error);
      return 0;
    }
  }

  getIngredientRecommendations(userProfile, limit = 10) {
    try {
      const recommendations = [];
      
      // Get suitable ingredients based on skin type
      const suitableIngredients = this.getSuitableIngredientsForSkinType(userProfile.skinType);
      
      // Score each ingredient
      for (const ingredient of suitableIngredients) {
        const score = this.calculateIngredientCompatibility(ingredient, userProfile);
        if (score > 50) { // Only include ingredients with good scores
          recommendations.push({
            ingredient,
            score,
            functions: this.getIngredientFunctions(ingredient),
            concerns: this.getTreatedConcerns(ingredient),
            benefits: this.getIngredientBenefits(ingredient)
          });
        }
      }

      // Sort by score and return top recommendations
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error getting ingredient recommendations:', error);
      return [];
    }
  }

  getSuitableIngredientsForSkinType(skinType) {
    // Return a list of ingredients suitable for the given skin type
    const ingredientMap = {
      'normal': ['hyaluronic acid', 'niacinamide', 'vitamin c', 'ceramide'],
      'dry': ['hyaluronic acid', 'ceramide', 'glycerin', 'lactic acid'],
      'oily': ['salicylic acid', 'niacinamide', 'glycolic acid', 'zinc oxide'],
      'combination': ['niacinamide', 'hyaluronic acid', 'salicylic acid'],
      'sensitive': ['ceramide', 'zinc oxide', 'hyaluronic acid']
    };

    return ingredientMap[skinType] || ingredientMap['normal'];
  }

  // === CACHE MANAGEMENT ===

  clearCache() {
    this.cache.clear();
    logger.info('Ontology service cache cleared');
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout / 1000 + ' seconds'
    };
  }

  // === HEALTH CHECK ===

  healthCheck() {
    return {
      loaded: this.loaded,
      storeSize: this.store ? this.store.statements.length : 0,
      cacheSize: this.cache.size,
      namespaces: Object.keys(this.namespaces).length
    };
  }
}

// Create singleton instance
const ontologyService = new OntologyService();

module.exports = ontologyService;