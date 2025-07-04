const axios = require('axios');
const { SPARQL_QUERIES } = require('../sparql/queries');

class SPARQLService {
  constructor() {
    this.fusekiEndpoint = process.env.FUSEKI_ENDPOINT || 'http://localhost:3030/matchcare';
  }

  async executeQuery(query, variables = {}) {
    // Replace variables in query template
    let processedQuery = query;
    Object.entries(variables).forEach(([key, value]) => {
      processedQuery = processedQuery.replace(
        new RegExp(`{{${key}}}`, 'g'), 
        value
      );
    });

    try {
      const response = await axios.post(`${this.fusekiEndpoint}/query`, {
        query: processedQuery
      }, {
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json'
        }
      });

      return this.parseResults(response.data);
    } catch (error) {
      console.error('SPARQL Query Error:', error);
      throw new Error('Failed to execute SPARQL query');
    }
  }

  async getPersonalizedRecommendations(userProfile) {
    const variables = {
      skinType: userProfile.skinType,
      concerns: userProfile.skinConcerns.map(c => `:${c}`).join(', ')
    };

    return this.executeQuery(
      SPARQL_QUERIES.PERSONALIZED_RECOMMENDATIONS, 
      variables
    );
  }

  async getIngredientCompatibility(ingredients) {
    const variables = {
      ingredientList: ingredients.map(i => `:${i}`).join(', ')
    };

    return this.executeQuery(
      SPARQL_QUERIES.INGREDIENT_COMPATIBILITY,
      variables
    );
  }

  parseResults(sparqlResults) {
    return sparqlResults.results.bindings.map(binding => {
      const result = {};
      Object.keys(binding).forEach(key => {
        result[key] = binding[key].value;
      });
      return result;
    });
  }
}

module.exports = new SPARQLService();