const fs = require('fs').promises;
const path = require('path');
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

class OntologyService {
  constructor() {
    this.store = new N3.Store();
    this.prefixes = {
      matchcare: 'http://www.semanticweb.org/msilaptop/ontologies/2025/4/skincareOntology/',
      owl: 'http://www.w3.org/2002/07/owl#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      xsd: 'http://www.w3.org/2001/XMLSchema#'
    };
    this.isLoaded = false;
    this.ontologyData = {
      skinTypes: {},
      concerns: {},
      ingredients: {},
      benefits: {},
      keyIngredients: {},
      functions: {},
      productCategories: {},
      synergisticIngredients: {},
      incompatibleIngredients: {}
    };
  }

  async loadOntology() {
    try {
      console.log('🔄 Loading skincare ontology...');
      
      const ontologyPath = path.join(__dirname, '../../data/ontology/skincareOntology.ttl');
      
      // Check if file exists
      try {
        await fs.access(ontologyPath);
      } catch (error) {
        console.log('⚠️  Ontology file not found, initializing with default mappings...');
        this.initializeDefaultMappings();
        return;
      }

      const ttlContent = await fs.readFile(ontologyPath, 'utf8');
      
      const parser = new N3.Parser({ prefixes: this.prefixes });
      const quads = parser.parse(ttlContent);
      
      this.store.addQuads(quads);
      
      // Process ontology data
      await this.processOntologyData();
      
      this.isLoaded = true;
      console.log('✅ Ontology loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading ontology:', error.message);
      console.log('🔄 Falling back to default mappings...');
      this.initializeDefaultMappings();
    }
  }

  async processOntologyData() {
    try {
      // Extract skin types
      this.extractSkinTypes();
      
      // Extract skin concerns
      this.extractSkinConcerns();
      
      // Extract ingredients data
      this.extractIngredients();
      
      // Extract key ingredients
      this.extractKeyIngredients();
      
      // Extract functions
      this.extractFunctions();
      
      // Extract benefits
      this.extractBenefits();
      
      // Extract product categories
      this.extractProductCategories();
      
      // Extract ingredient relationships
      this.extractIngredientRelationships();
      
      console.log('📊 Ontology data processed:', {
        skinTypes: Object.keys(this.ontologyData.skinTypes).length,
        concerns: Object.keys(this.ontologyData.concerns).length,
        ingredients: Object.keys(this.ontologyData.ingredients).length,
        keyIngredients: Object.keys(this.ontologyData.keyIngredients).length
      });
      
    } catch (error) {
      console.error('Error processing ontology data:', error);
    }
  }

  extractSkinTypes() {
    const skinTypeQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.rdf + 'type'),
      namedNode(this.prefixes.matchcare + 'SkinType'),
      null
    );

    skinTypeQuads.forEach(quad => {
      const skinTypeName = this.extractLocalName(quad.subject.value).toLowerCase();
      this.ontologyData.skinTypes[skinTypeName] = {
        uri: quad.subject.value,
        name: skinTypeName,
        label: this.getLabel(quad.subject) || skinTypeName
      };
    });
  }

  extractSkinConcerns() {
    const concernQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.rdf + 'type'),
      namedNode(this.prefixes.matchcare + 'SkinConcern'),
      null
    );

    concernQuads.forEach(quad => {
      const concernName = this.extractLocalName(quad.subject.value).toLowerCase();
      this.ontologyData.concerns[concernName] = {
        uri: quad.subject.value,
        name: concernName,
        label: this.getLabel(quad.subject) || concernName
      };
    });
  }

  extractIngredients() {
    const ingredientQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.rdf + 'type'),
      namedNode(this.prefixes.matchcare + 'Ingredient'),
      null
    );

    ingredientQuads.forEach(quad => {
      const ingredientName = this.extractLocalName(quad.subject.value);
      const ingredient = {
        uri: quad.subject.value,
        name: ingredientName,
        label: this.getLabel(quad.subject) || ingredientName,
        functions: this.getObjectProperties(quad.subject, 'hasFunction'),
        suitableForSkinTypes: this.getObjectProperties(quad.subject, 'recommendedFor'),
        treatsConcerns: this.getObjectProperties(quad.subject, 'treatsConcern'),
        benefits: this.getObjectProperties(quad.subject, 'providesIngredientBenefit')
      };
      
      this.ontologyData.ingredients[ingredientName.toLowerCase()] = ingredient;
    });
  }

  extractKeyIngredients() {
    const keyIngredientQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.rdf + 'type'),
      namedNode(this.prefixes.matchcare + 'KeyIngredient'),
      null
    );

    keyIngredientQuads.forEach(quad => {
      const ingredientName = this.extractLocalName(quad.subject.value);
      this.ontologyData.keyIngredients[ingredientName.toLowerCase()] = {
        uri: quad.subject.value,
        name: ingredientName,
        label: this.getLabel(quad.subject) || ingredientName
      };
    });
  }

  extractFunctions() {
    const functionQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.rdf + 'type'),
      namedNode(this.prefixes.matchcare + 'WhatItDoes'),
      null
    );

    functionQuads.forEach(quad => {
      const functionName = this.extractLocalName(quad.subject.value);
      this.ontologyData.functions[functionName.toLowerCase()] = {
        uri: quad.subject.value,
        name: functionName,
        label: this.getLabel(quad.subject) || functionName
      };
    });
  }

  extractBenefits() {
    const benefitQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.rdf + 'type'),
      namedNode(this.prefixes.matchcare + 'Benefit'),
      null
    );

    benefitQuads.forEach(quad => {
      const benefitName = this.extractLocalName(quad.subject.value);
      this.ontologyData.benefits[benefitName.toLowerCase()] = {
        uri: quad.subject.value,
        name: benefitName,
        label: this.getLabel(quad.subject) || benefitName
      };
    });
  }

  extractProductCategories() {
    const categoryQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.rdf + 'type'),
      namedNode(this.prefixes.matchcare + 'ProductCategory'),
      null
    );

    categoryQuads.forEach(quad => {
      const categoryName = this.extractLocalName(quad.subject.value);
      this.ontologyData.productCategories[categoryName.toLowerCase()] = {
        uri: quad.subject.value,
        name: categoryName,
        label: this.getLabel(quad.subject) || categoryName
      };
    });
  }

  extractIngredientRelationships() {
    // Extract synergistic relationships
    const synergisticQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.matchcare + 'synergisticWith'),
      null,
      null
    );

    synergisticQuads.forEach(quad => {
      const ingredient1 = this.extractLocalName(quad.subject.value).toLowerCase();
      const ingredient2 = this.extractLocalName(quad.object.value).toLowerCase();
      
      if (!this.ontologyData.synergisticIngredients[ingredient1]) {
        this.ontologyData.synergisticIngredients[ingredient1] = [];
      }
      this.ontologyData.synergisticIngredients[ingredient1].push(ingredient2);
    });

    // Extract incompatible relationships
    const incompatibleQuads = this.store.getQuads(
      null,
      namedNode(this.prefixes.matchcare + 'incompatibleWith'),
      null,
      null
    );

    incompatibleQuads.forEach(quad => {
      const ingredient1 = this.extractLocalName(quad.subject.value).toLowerCase();
      const ingredient2 = this.extractLocalName(quad.object.value).toLowerCase();
      
      if (!this.ontologyData.incompatibleIngredients[ingredient1]) {
        this.ontologyData.incompatibleIngredients[ingredient1] = [];
      }
      this.ontologyData.incompatibleIngredients[ingredient1].push(ingredient2);
    });
  }

  // Helper methods
  extractLocalName(uri) {
    return uri.split('/').pop().split('#').pop();
  }

  getLabel(subject) {
    const labelQuad = this.store.getQuads(
      subject,
      namedNode(this.prefixes.rdfs + 'label'),
      null,
      null
    )[0];
    
    return labelQuad ? labelQuad.object.value : null;
  }

  getObjectProperties(subject, property) {
    const quads = this.store.getQuads(
      subject,
      namedNode(this.prefixes.matchcare + property),
      null,
      null
    );
    
    return quads.map(quad => this.extractLocalName(quad.object.value).toLowerCase());
  }

  // Public API methods
  getSuitableSkinTypesForProduct(productCategory) {
    if (!this.isLoaded) return [];
    
    // Define category to skin type mappings
    const categoryMappings = {
      'cleanser': ['normal', 'oily', 'combination', 'dry', 'sensitive'],
      'moisturizer': ['normal', 'dry', 'combination', 'sensitive'],
      'serum': ['normal', 'oily', 'combination', 'dry'],
      'toner': ['normal', 'oily', 'combination'],
      'treatment': ['normal', 'oily', 'combination', 'dry'],
      'suncare': ['normal', 'oily', 'combination', 'dry', 'sensitive'],
      'eye care': ['normal', 'dry', 'combination', 'sensitive'],
      'face mask': ['normal', 'oily', 'combination', 'dry']
    };

    const category = productCategory ? productCategory.toLowerCase() : '';
    return categoryMappings[category] || ['normal', 'combination'];
  }

  getConcernsForProduct(productCategory) {
    if (!this.isLoaded) return [];
    
    const categoryMappings = {
      'cleanser': ['acne', 'oiliness', 'dullness'],
      'moisturizer': ['dryness', 'sensitivity', 'fine_lines'],
      'serum': ['acne', 'dark_spots', 'fine_lines', 'dullness'],
      'toner': ['acne', 'oiliness', 'pores'],
      'treatment': ['acne', 'wrinkles', 'dark_spots', 'texture'],
      'suncare': ['dark_spots', 'fine_lines', 'sensitivity'],
      'eye care': ['dark_undereyes', 'fine_lines', 'wrinkles'],
      'face mask': ['dullness', 'dryness', 'acne', 'texture']
    };

    const category = productCategory ? productCategory.toLowerCase() : '';
    return categoryMappings[category] || [];
  }

  getBenefitsForProduct(productCategory) {
    if (!this.isLoaded) return [];
    
    const categoryMappings = {
      'cleanser': ['skin conditioning'],
      'moisturizer': ['hydrating', 'skin conditioning'],
      'serum': ['brightening', 'hydrating', 'helps with anti aging'],
      'toner': ['reduces large pores', 'hydrating'],
      'treatment': ['brightening', 'good for texture', 'helps with anti aging'],
      'suncare': ['skin conditioning'],
      'eye care': ['hydrating', 'helps with anti aging'],
      'face mask': ['hydrating', 'brightening', 'good for texture']
    };

    const category = productCategory ? productCategory.toLowerCase() : '';
    return categoryMappings[category] || [];
  }

  getIngredientFunctions(ingredientName) {
    if (!this.isLoaded || !ingredientName) return [];
    
    const ingredient = this.ontologyData.ingredients[ingredientName.toLowerCase()];
    return ingredient ? ingredient.functions : [];
  }

  getSuitableSkinTypes(ingredientName) {
    if (!this.isLoaded || !ingredientName) return [];
    
    const ingredient = this.ontologyData.ingredients[ingredientName.toLowerCase()];
    return ingredient ? ingredient.suitableForSkinTypes : [];
  }

  getTreatedConcerns(ingredientName) {
    if (!this.isLoaded || !ingredientName) return [];
    
    const ingredient = this.ontologyData.ingredients[ingredientName.toLowerCase()];
    return ingredient ? ingredient.treatsConcerns : [];
  }

  getIngredientBenefits(ingredientName) {
    if (!this.isLoaded || !ingredientName) return [];
    
    const ingredient = this.ontologyData.ingredients[ingredientName.toLowerCase()];
    return ingredient ? ingredient.benefits : [];
  }

  getSynergisticIngredients(ingredientName) {
    if (!this.isLoaded || !ingredientName) return [];
    
    return this.ontologyData.synergisticIngredients[ingredientName.toLowerCase()] || [];
  }

  getIncompatibleIngredients(ingredientName) {
    if (!this.isLoaded || !ingredientName) return [];
    
    return this.ontologyData.incompatibleIngredients[ingredientName.toLowerCase()] || [];
  }

  isKeyIngredient(ingredientName) {
    if (!this.isLoaded || !ingredientName) return false;
    
    return !!this.ontologyData.keyIngredients[ingredientName.toLowerCase()];
  }

  // Fallback default mappings when ontology file is not available
  initializeDefaultMappings() {
    this.ontologyData = {
      skinTypes: {
        'normal': { name: 'normal', label: 'Normal' },
        'dry': { name: 'dry', label: 'Dry' },
        'oily': { name: 'oily', label: 'Oily' },
        'combination': { name: 'combination', label: 'Combination' },
        'sensitive': { name: 'sensitive', label: 'Sensitive' }
      },
      concerns: {
        'acne': { name: 'acne', label: 'Acne' },
        'wrinkles': { name: 'wrinkles', label: 'Wrinkles' },
        'fine_lines': { name: 'fine_lines', label: 'Fine Lines' },
        'dark_spots': { name: 'dark_spots', label: 'Dark Spots' },
        'dryness': { name: 'dryness', label: 'Dryness' },
        'oiliness': { name: 'oiliness', label: 'Oiliness' },
        'sensitivity': { name: 'sensitivity', label: 'Sensitivity' },
        'pores': { name: 'pores', label: 'Large Pores' },
        'dullness': { name: 'dullness', label: 'Dullness' },
        'redness': { name: 'redness', label: 'Redness' }
      },
      keyIngredients: {
        'hyaluronic acid': { name: 'hyaluronic acid', label: 'Hyaluronic Acid' },
        'niacinamide': { name: 'niacinamide', label: 'Niacinamide' },
        'vitamin c': { name: 'vitamin c', label: 'Vitamin C' },
        'retinoid': { name: 'retinoid', label: 'Retinoid' },
        'ceramides': { name: 'ceramides', label: 'Ceramides' },
        'aha': { name: 'aha', label: 'Alpha Hydroxy Acid' },
        'bha': { name: 'bha', label: 'Beta Hydroxy Acid' }
      },
      synergisticIngredients: {
        'vitamin c': ['vitamin e'],
        'hyaluronic acid': ['niacinamide', 'ceramides', 'peptides'],
        'niacinamide': ['hyaluronic acid']
      },
      incompatibleIngredients: {
        'retinoid': ['aha', 'bha', 'vitamin c'],
        'aha': ['retinoid', 'bha'],
        'bha': ['retinoid']
      }
    };
    
    this.isLoaded = true;
    console.log('✅ Default ontology mappings initialized');
  }

  isLoaded() {
    return this.isLoaded;
  }

  // Get all available data
  getAllSkinTypes() {
    return Object.values(this.ontologyData.skinTypes);
  }

  getAllConcerns() {
    return Object.values(this.ontologyData.concerns);
  }

  getAllKeyIngredients() {
    return Object.values(this.ontologyData.keyIngredients);
  }

  getAllBenefits() {
    return Object.values(this.ontologyData.benefits);
  }
}

module.exports = new OntologyService();