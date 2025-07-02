const { Op } = require('sequelize');
const { Product, Ingredient, UserProfile, ProductMatchScore } = require('../models');
const ontologyService = require('./ontologyService');
const natural = require('natural');

class RecommendationEngine {
  constructor() {
    this.weightConfig = {
      skinTypeMatch: 0.35,        // 35% - Most important
      concernsMatch: 0.30,        // 30% - Very important  
      ingredientPreference: 0.20, // 20% - Important
      formulation: 0.10,          // 10% - Moderate
      brandPreference: 0.05       // 5% - Least important
    };
  }

  // Main recommendation function
  async generateRecommendations(userId, options = {}) {
    try {
      const {
        limit = 20,
        category = null,
        excludeIds = [],
        includeExplanation = true,
        forceRecalculate = false
      } = options;

      // Get user profile
      const userProfile = await UserProfile.findOne({ where: { userId } });
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Build query for candidate products
      const where = { 
        isActive: true,
        id: { [Op.notIn]: excludeIds }
      };

      if (category) {
        where.mainCategory = { [Op.iLike]: `%${category}%` };
      }

      // Apply basic filters from user profile
      const profileFilters = userProfile.getProductFilters();
      
      if (profileFilters.suitableForSkinTypes) {
        where.suitableForSkinTypes = { [Op.contains]: [profileFilters.suitableForSkinTypes] };
      }
      
      if (profileFilters.addressesConcerns) {
        where.addressesConcerns = { [Op.overlap]: profileFilters.addressesConcerns };
      }

      // Apply formulation filters
      Object.keys(profileFilters).forEach(key => {
        if (key.endsWith('Free') && profileFilters[key]) {
          where[key] = true;
        }
      });

      const candidateProducts = await Product.findAll({
        where,
        limit: limit * 2, // Get more candidates to filter from
        order: [['rating', 'DESC'], ['reviewCount', 'DESC']]
      });

      // Calculate or retrieve match scores
      const scoredProducts = await Promise.all(
        candidateProducts.map(async (product) => {
          let matchScore, reasons;

          // Check if we have cached score and it's recent
          if (!forceRecalculate) {
            const existingScore = await ProductMatchScore.findOne({
              where: { 
                userId, 
                productId: product.id,
                calculatedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days
              }
            });

            if (existingScore) {
              matchScore = existingScore.score;
              reasons = existingScore.reasons;
            }
          }

          // Calculate new score if not cached
          if (!matchScore) {
            const scores = await this.calculateDetailedScore(product, userProfile);
            matchScore = scores.totalScore;
            reasons = scores.reasons;

            // Cache the score
            await ProductMatchScore.upsert({
              userId,
              productId: product.id,
              score: matchScore,
              reasons,
              calculatedAt: new Date()
            });
          }

          return {
            ...product.get({ plain: true }),
            matchScore,
            matchReasons: reasons
          };
        })
      );

      // Sort by match score and apply limit
      scoredProducts.sort((a, b) => b.matchScore - a.matchScore);
      const recommendations = scoredProducts.slice(0, limit);

      // Add explanations if requested
      if (includeExplanation) {
        recommendations.forEach(product => {
          if (!product.explanation) {
            product.explanation = this.generateExplanation(product, userProfile);
          }
        });
      }

      return {
        recommendations,
        totalCandidates: candidateProducts.length,
        userProfile: {
          skinType: userProfile.skinType,
          concerns: userProfile.skinConcerns,
          preferences: userProfile.routineComplexity
        }
      };

    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  // Calculate detailed scoring
  async calculateDetailedScore(product, userProfile) {
    const scores = {
      skinTypeScore: 0,
      concernsScore: 0,
      ingredientScore: 0,
      formulationScore: 0,
      brandScore: 0,
      totalScore: 0,
      reasons: []
    };

    // 1. Skin Type Compatibility (35%)
    scores.skinTypeScore = this.calculateSkinTypeScore(product, userProfile);
    
    // 2. Skin Concerns Match (30%)
    scores.concernsScore = this.calculateConcernsScore(product, userProfile);
    
    // 3. Ingredient Preference (20%)
    scores.ingredientScore = await this.calculateIngredientScore(product, userProfile);
    
    // 4. Formulation Preferences (10%)
    scores.formulationScore = this.calculateFormulationScore(product, userProfile);
    
    // 5. Brand Preference (5%)
    scores.brandScore = this.calculateBrandScore(product, userProfile);

    // Calculate total weighted score
    scores.totalScore = Math.round(
      (scores.skinTypeScore * this.weightConfig.skinTypeMatch) +
      (scores.concernsScore * this.weightConfig.concernsMatch) +
      (scores.ingredientScore * this.weightConfig.ingredientPreference) +
      (scores.formulationScore * this.weightConfig.formulation) +
      (scores.brandScore * this.weightConfig.brandPreference)
    );

    // Generate reasons based on scores
    if (scores.skinTypeScore >= 80) {
      scores.reasons.push(`Perfect for ${userProfile.skinType} skin`);
    }
    if (scores.concernsScore >= 70) {
      const matchingConcerns = product.addressesConcerns?.filter(concern =>
        userProfile.skinConcerns?.includes(concern)
      ) || [];
      if (matchingConcerns.length > 0) {
        scores.reasons.push(`Addresses ${matchingConcerns.slice(0, 2).join(', ')}`);
      }
    }
    if (scores.ingredientScore >= 70) {
      scores.reasons.push('Contains beneficial ingredients for you');
    }
    if (scores.formulationScore >= 80) {
      scores.reasons.push('Formulated to avoid your sensitivities');
    }

    return scores;
  }

  // Skin type compatibility scoring
  calculateSkinTypeScore(product, userProfile) {
    if (!product.suitableForSkinTypes || !userProfile.skinType) return 50;

    if (product.suitableForSkinTypes.includes(userProfile.skinType)) {
      return 100;
    }

    // Check for compatible skin types
    const compatibilityMap = {
      'normal': ['combination'],
      'dry': ['sensitive'],
      'oily': ['combination'],
      'combination': ['normal', 'oily'],
      'sensitive': ['dry', 'normal']
    };

    const compatibleTypes = compatibilityMap[userProfile.skinType] || [];
    const hasCompatible = product.suitableForSkinTypes.some(type => 
      compatibleTypes.includes(type)
    );

    return hasCompatible ? 70 : 30;
  }

  // Skin concerns matching scoring
  calculateConcernsScore(product, userProfile) {
    if (!product.addressesConcerns || !userProfile.skinConcerns || userProfile.skinConcerns.length === 0) {
      return 50; // Neutral score if no concerns specified
    }

    const matchingConcerns = product.addressesConcerns.filter(concern =>
      userProfile.skinConcerns.includes(concern)
    );

    if (matchingConcerns.length === 0) return 30;

    // Calculate percentage match with bonus for multiple matches
    const matchPercentage = matchingConcerns.length / userProfile.skinConcerns.length;
    const baseScore = matchPercentage * 100;
    
    // Bonus for addressing multiple concerns
    const bonusScore = Math.min(20, matchingConcerns.length * 5);
    
    return Math.min(100, baseScore + bonusScore);
  }

  // Ingredient preference scoring
  async calculateIngredientScore(product, userProfile) {
    let score = 50; // Base score
    
    // Check for avoided ingredients (major penalty)
    if (userProfile.avoidedIngredients && userProfile.avoidedIngredients.length > 0) {
      const hasAvoidedIngredients = product.ingredients.some(ingredient =>
        userProfile.avoidedIngredients.some(avoided => 
          ingredient.toLowerCase().includes(avoided.toLowerCase())
        )
      );
      
      if (hasAvoidedIngredients) {
        return 0; // Disqualify product
      } else {
        score += 20; // Bonus for not having avoided ingredients
      }
    }

    // Check for preferred ingredients (bonus)
    if (userProfile.preferredIngredients && userProfile.preferredIngredients.length > 0) {
      const hasPreferredIngredients = product.keyIngredients.some(ingredient =>
        userProfile.preferredIngredients.includes(ingredient)
      );
      
      if (hasPreferredIngredients) {
        score += 30;
      }
    }

    // Check key ingredients effectiveness for user's concerns
    if (product.keyIngredients && userProfile.skinConcerns) {
      let ingredientBonus = 0;
      
      for (const keyIngredient of product.keyIngredients) {
        const ingredient = await Ingredient.findOne({ 
          where: { name: { [Op.iLike]: `%${keyIngredient}%` } }
        });
        
        if (ingredient && ingredient.addressesConcerns) {
          const concernsMatch = ingredient.addressesConcerns.filter(concern =>
            userProfile.skinConcerns.includes(concern)
          );
          ingredientBonus += concernsMatch.length * 5;
        }
      }
      
      score += Math.min(20, ingredientBonus);
    }

    return Math.min(100, score);
  }

  // Formulation preferences scoring
  calculateFormulationScore(product, userProfile) {
    let score = 50; // Base score

    if (!userProfile.knownSensitivities || userProfile.knownSensitivities.includes('none')) {
      return score;
    }

    // Check formulation traits based on sensitivities
    const sensitivityMap = {
      'fragrance': 'fragranceFree',
      'alcohol': 'alcoholFree',
      'silicone': 'siliconeFree',
      'sulfates': 'sulfateFree',
      'parabens': 'parabenFree'
    };

    for (const sensitivity of userProfile.knownSensitivities) {
      if (sensitivity === 'none') continue;
      
      const traitKey = sensitivityMap[sensitivity];
      if (traitKey && product[traitKey]) {
        score += 15; // Bonus for each matching formulation trait
      } else if (traitKey && !product[traitKey]) {
        score -= 10; // Penalty for not having required trait
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  // Brand preference scoring
  calculateBrandScore(product, userProfile) {
    if (!userProfile.preferredBrands || userProfile.preferredBrands.length === 0) {
      return 50; // Neutral score if no brand preferences
    }

    const isPreferredBrand = userProfile.preferredBrands.some(brand =>
      brand.toLowerCase() === product.brand.toLowerCase()
    );
    
    return isPreferredBrand ? 100 : 30;
  }

  // Generate explanation for recommendation
  generateExplanation(product, userProfile) {
    return product.matchReasons?.join(' • ') || 'Good match for your profile';
  }

  // Get routine recommendations
  async generateRoutineRecommendations(userId) {
    try {
      const userProfile = await UserProfile.findOne({ where: { userId } });
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const routineSteps = {
        morning: [
          { step: 1, category: 'cleanser', required: true },
          { step: 2, category: 'toner', required: false },
          { step: 3, category: 'serum', required: true },
          { step: 4, category: 'moisturizer', required: true },
          { step: 5, category: 'sunscreen', required: true }
        ],
        evening: [
          { step: 1, category: 'cleanser', required: true },
          { step: 2, category: 'exfoliator', required: false },
          { step: 3, category: 'serum', required: true },
          { step: 4, category: 'moisturizer', required: true }
        ]
      };

      const routine = {
        morning: [],
        evening: []
      };

      // Generate recommendations for each step
      for (const [timeOfDay, steps] of Object.entries(routineSteps)) {
        for (const stepInfo of steps) {
          const recommendations = await this.generateRecommendations(userId, {
            category: stepInfo.category,
            limit: 3
          });

          routine[timeOfDay].push({
            ...stepInfo,
            recommendations: recommendations.recommendations
          });
        }
      }

      return routine;

    } catch (error) {
      console.error('Error generating routine recommendations:', error);
      throw error;
    }
  }

  // Content-based filtering using ingredient similarity
  async getIngredientBasedRecommendations(productId, limit = 5) {
    try {
      const sourceProduct = await Product.findByPk(productId);
      if (!sourceProduct) {
        throw new Error('Source product not found');
      }

      // Find products with similar ingredients
      const similarProducts = await Product.findAll({
        where: {
          id: { [Op.ne]: productId },
          [Op.or]: [
            { keyIngredients: { [Op.overlap]: sourceProduct.keyIngredients } },
            { mainCategory: sourceProduct.mainCategory }
          ],
          isActive: true
        },
        limit: limit * 2,
        order: [['rating', 'DESC']]
      });

      // Calculate similarity scores
      const scoredProducts = similarProducts.map(product => {
        const similarity = this.calculateIngredientSimilarity(
          sourceProduct.keyIngredients,
          product.keyIngredients
        );
        
        return {
          ...product.get({ plain: true }),
          similarityScore: similarity
        };
      });

      // Sort by similarity and return top results
      scoredProducts.sort((a, b) => b.similarityScore - a.similarityScore);
      return scoredProducts.slice(0, limit);

    } catch (error) {
      console.error('Error getting ingredient-based recommendations:', error);
      throw error;
    }
  }

  // Calculate ingredient similarity using Jaccard similarity
  calculateIngredientSimilarity(ingredients1, ingredients2) {
    if (!ingredients1 || !ingredients2) return 0;

    const set1 = new Set(ingredients1.map(i => i.toLowerCase()));
    const set2 = new Set(ingredients2.map(i => i.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size === 0 ? 0 : (intersection.size / union.size) * 100;
  }

  // Get trending recommendations based on user activity
  async getTrendingRecommendations(limit = 10) {
    try {
      const trending = await Product.findAll({
        where: { isActive: true },
        order: [
          ['viewCount', 'DESC'], 
          ['favoriteCount', 'DESC'], 
          ['rating', 'DESC']
        ],
        limit,
        attributes: { exclude: ['deletedAt'] }
      });

      return trending.map(product => ({
        ...product.get({ plain: true }),
        trendingScore: this.calculateTrendingScore(product)
      }));

    } catch (error) {
      console.error('Error getting trending recommendations:', error);
      throw error;
    }
  }

  calculateTrendingScore(product) {
    const viewWeight = 0.4;
    const favoriteWeight = 0.3;
    const ratingWeight = 0.3;

    const normalizedViews = Math.min(100, (product.viewCount || 0) / 10);
    const normalizedFavorites = Math.min(100, (product.favoriteCount || 0) * 5);
    const normalizedRating = (product.rating || 0) * 20;

    return Math.round(
      normalizedViews * viewWeight +
      normalizedFavorites * favoriteWeight +
      normalizedRating * ratingWeight
    );
  }
}

module.exports = new RecommendationEngine();