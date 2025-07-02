const { UserProfile, User } = require('../models');
const ontologyService = require('../services/ontologyService');

class QuizController {
  // Get quiz questions
  async getQuestions(req, res) {
    try {
      const questions = [
        {
          id: 'skin_type',
          question: 'What is your skin type?',
          type: 'single_choice',
          options: [
            { value: 'normal', label: 'Normal', description: 'Balanced, not too oily or dry' },
            { value: 'dry', label: 'Dry', description: 'Often feels tight, may have flaky patches' },
            { value: 'oily', label: 'Oily', description: 'Shiny, enlarged pores, prone to breakouts' },
            { value: 'combination', label: 'Combination', description: 'Oily T-zone, dry or normal cheeks' },
            { value: 'sensitive', label: 'Sensitive', description: 'Easily irritated, reactive to products' },
            { value: 'unsure', label: "I'm not sure", description: 'Take a quick assessment' }
          ]
        },
        {
          id: 'skin_assessment',
          question: 'How does your skin feel when you wake up in the morning?',
          type: 'single_choice',
          condition: { skin_type: 'unsure' },
          options: [
            { value: 'tight_dry', label: 'Tight, dry, maybe flaky' },
            { value: 'normal_balanced', label: 'Normal, comfortable, balanced' },
            { value: 'oily_shiny', label: 'Oily or shiny, especially on forehead, nose, and chin' },
            { value: 'combination', label: 'Dry or normal on cheeks, oily in T-zone' }
          ]
        },
        {
          id: 'oily_shine',
          question: 'How often do you get oily shine during the day?',
          type: 'single_choice',
          condition: { skin_type: 'unsure' },
          options: [
            { value: 'rarely_dry', label: 'Rarely, skin feels dry' },
            { value: 'rarely_balanced', label: 'Rarely, skin looks balanced' },
            { value: 'often_shiny', label: 'Often, skin looks shiny or greasy' },
            { value: 'tzone_only', label: 'Only in some areas, mostly T-zone' }
          ]
        },
        {
          id: 'flaky_patches',
          question: 'Do you experience flaky or rough patches?',
          type: 'single_choice',
          condition: { skin_type: 'unsure' },
          options: [
            { value: 'yes_frequently', label: 'Yes, frequently' },
            { value: 'rarely', label: 'Rarely' },
            { value: 'almost_never', label: 'Almost never' },
            { value: 'sometimes_cheeks', label: 'Sometimes on cheeks only' }
          ]
        },
        {
          id: 'skin_concerns',
          question: 'What are your main skin concerns? (Select all that apply)',
          type: 'multiple_choice',
          options: [
            { value: 'acne', label: 'Acne', description: 'Pimples, blackheads, whiteheads' },
            { value: 'wrinkles', label: 'Wrinkles', description: 'Deep lines and creases' },
            { value: 'fine_lines', label: 'Fine Lines', description: 'Small, surface-level lines' },
            { value: 'sensitivity', label: 'Sensitivity', description: 'Redness, irritation, reactions' },
            { value: 'dryness', label: 'Dryness', description: 'Flaky, tight, rough patches' },
            { value: 'oiliness', label: 'Excess Oil', description: 'Shiny, greasy appearance' },
            { value: 'redness', label: 'Redness', description: 'Persistent red areas' },
            { value: 'pores', label: 'Large Pores', description: 'Visible, enlarged pores' },
            { value: 'dullness', label: 'Dullness', description: 'Lack of radiance or glow' },
            { value: 'texture', label: 'Uneven Texture', description: 'Bumps, roughness' },
            { value: 'dark_spots', label: 'Dark Spots', description: 'Hyperpigmentation, age spots' },
            { value: 'dark_undereyes', label: 'Dark Under Eyes', description: 'Dark circles' },
            { value: 'fungal_acne', label: 'Fungal Acne', description: 'Small, itchy bumps' },
            { value: 'eczema', label: 'Eczema', description: 'Dry, itchy, inflamed skin' }
          ]
        },
        {
          id: 'sensitivities',
          question: 'Do you have any known sensitivities or allergies?',
          type: 'multiple_choice',
          options: [
            { value: 'fragrance', label: 'Fragrance', description: 'Perfumes, essential oils' },
            { value: 'alcohol', label: 'Alcohol', description: 'Drying alcohols like denatured alcohol' },
            { value: 'silicone', label: 'Silicones', description: 'Dimethicone, cyclomethicone' },
            { value: 'sulfates', label: 'Sulfates', description: 'SLS, SLES in cleansers' },
            { value: 'parabens', label: 'Parabens', description: 'Preservatives like methylparaben' },
            { value: 'none', label: 'No Known Sensitivities', description: 'No known reactions' }
          ]
        },
        {
          id: 'routine_complexity',
          question: 'How complex would you like your routine to be?',
          type: 'single_choice',
          options: [
            { value: 'minimal', label: 'Minimal (3-4 steps)', description: 'Simple, time-efficient routine' },
            { value: 'moderate', label: 'Moderate (5-7 steps)', description: 'Balanced approach with variety' },
            { value: 'extensive', label: 'Extensive (8+ steps)', description: 'Comprehensive, detailed routine' }
          ]
        },
        {
          id: 'budget_range',
          question: 'What is your budget range per product?',
          type: 'single_choice',
          options: [
            { value: 'budget', label: 'Budget ($5-15)', description: 'Affordable drugstore options' },
            { value: 'mid_range', label: 'Mid-range ($15-40)', description: 'Quality mid-tier products' },
            { value: 'high_end', label: 'High-end ($40-80)', description: 'Premium skincare products' },
            { value: 'luxury', label: 'Luxury ($80+)', description: 'Top-tier luxury brands' },
            { value: 'mixed', label: 'Mixed Budget', description: 'Varies by product category' }
          ]
        }
      ];

      res.json({
        success: true,
        data: questions
      });

    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching quiz questions', 
        error: error.message 
      });
    }
  }

  // Submit quiz responses
  async submitQuiz(req, res) {
    try {
      const { userId } = req.user;
      const { responses } = req.body;

      if (!responses || Object.keys(responses).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Quiz responses are required' 
        });
      }

      // Process skin type assessment if needed
      let skinType = responses.skin_type;
      if (skinType === 'unsure') {
        skinType = this.determineSkinType(responses);
      }

      // Parse budget range
      const budgetRange = this.parseBudgetRange(responses.budget_range);

      // Create or update user profile
      let userProfile = await UserProfile.findOne({ where: { userId } });
      
      if (!userProfile) {
        userProfile = await UserProfile.create({ userId });
      }

      // Update profile data
      await userProfile.update({
        skinType: skinType,
        skinConcerns: responses.skin_concerns || [],
        knownSensitivities: responses.sensitivities || [],
        routineComplexity: responses.routine_complexity || 'moderate',
        budgetRange: budgetRange,
        lastQuizDate: new Date(),
        quizResponses: Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          answer,
          timestamp: new Date()
        })),
        skinAnalysis: this.calculateSkinAnalysis(responses)
      });

      // Calculate profile completeness
      userProfile.calculateCompleteness();
      await userProfile.save();

      // Update user's profile completion status
      await User.update(
        { isProfileComplete: userProfile.profileCompleteness >= 80 },
        { where: { id: userId } }
      );

      res.json({
        success: true,
        message: 'Quiz submitted successfully',
        data: {
          profile: userProfile,
          skinType,
          analysisComplete: true
        }
      });

    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error submitting quiz', 
        error: error.message 
      });
    }
  }

  // Determine skin type from assessment questions
  determineSkinType(responses) {
    const morning = responses.skin_assessment;
    const shine = responses.oily_shine;
    const flaky = responses.flaky_patches;

    // Scoring system for skin type determination
    let dryScore = 0;
    let oilyScore = 0;
    let normalScore = 0;
    let combinationScore = 0;

    // Morning feeling scoring
    if (morning === 'tight_dry') dryScore += 3;
    else if (morning === 'normal_balanced') normalScore += 3;
    else if (morning === 'oily_shiny') oilyScore += 3;
    else if (morning === 'combination') combinationScore += 3;

    // Oil shine scoring
    if (shine === 'rarely_dry') dryScore += 2;
    else if (shine === 'rarely_balanced') normalScore += 2;
    else if (shine === 'often_shiny') oilyScore += 2;
    else if (shine === 'tzone_only') combinationScore += 2;

    // Flaky patches scoring
    if (flaky === 'yes_frequently') dryScore += 2;
    else if (flaky === 'rarely') normalScore += 1;
    else if (flaky === 'almost_never') oilyScore += 1;
    else if (flaky === 'sometimes_cheeks') combinationScore += 1;

    // Determine highest score
    const scores = { dry: dryScore, oily: oilyScore, normal: normalScore, combination: combinationScore };
    const maxScore = Math.max(...Object.values(scores));
    
    // Return skin type with highest score
    for (const [type, score] of Object.entries(scores)) {
      if (score === maxScore) return type;
    }

    return 'normal'; // Default fallback
  }

  // Parse budget range from response
  parseBudgetRange(budgetResponse) {
    const budgetMap = {
      'budget': { min: 5, max: 15 },
      'mid_range': { min: 15, max: 40 },
      'high_end': { min: 40, max: 80 },
      'luxury': { min: 80, max: 200 },
      'mixed': { min: 5, max: 80 }
    };

    return budgetMap[budgetResponse] || { min: 5, max: 50 };
  }

  // Calculate skin analysis scores
  calculateSkinAnalysis(responses) {
    const analysis = {
      tZoneOiliness: 3,
      cheekDryness: 3,
      sensitivity: 3,
      acneProneness: 3,
      confidenceScore: 85
    };

    // Adjust based on skin type
    const skinType = responses.skin_type;
    if (skinType === 'oily') {
      analysis.tZoneOiliness = 5;
      analysis.cheekDryness = 2;
    } else if (skinType === 'dry') {
      analysis.tZoneOiliness = 2;
      analysis.cheekDryness = 5;
    } else if (skinType === 'combination') {
      analysis.tZoneOiliness = 4;
      analysis.cheekDryness = 4;
    } else if (skinType === 'sensitive') {
      analysis.sensitivity = 5;
    }

    // Adjust based on concerns
    const concerns = responses.skin_concerns || [];
    if (concerns.includes('acne')) analysis.acneProneness = 5;
    if (concerns.includes('sensitivity') || concerns.includes('redness')) analysis.sensitivity = 5;
    if (concerns.includes('dryness')) analysis.cheekDryness = Math.max(analysis.cheekDryness, 4);
    if (concerns.includes('oiliness')) analysis.tZoneOiliness = Math.max(analysis.tZoneOiliness, 4);

    // Adjust based on assessment responses
    if (responses.skin_assessment === 'tight_dry') analysis.cheekDryness = 5;
    if (responses.oily_shine === 'often_shiny') analysis.tZoneOiliness = 5;
    if (responses.flaky_patches === 'yes_frequently') analysis.cheekDryness = Math.max(analysis.cheekDryness, 4);

    return analysis;
  }

  // Get user's quiz history
  async getQuizHistory(req, res) {
    try {
      const { userId } = req.user;

      const userProfile = await UserProfile.findOne({ 
        where: { userId },
        attributes: ['quizResponses', 'lastQuizDate', 'skinAnalysis', 'profileCompleteness']
      });

      if (!userProfile) {
        return res.status(404).json({ 
          success: false, 
          message: 'User profile not found' 
        });
      }

      res.json({
        success: true,
        data: {
          lastQuizDate: userProfile.lastQuizDate,
          skinAnalysis: userProfile.skinAnalysis,
          profileCompleteness: userProfile.profileCompleteness,
          quizCount: userProfile.quizResponses ? userProfile.quizResponses.length : 0
        }
      });

    } catch (error) {
      console.error('Error fetching quiz history:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching quiz history', 
        error: error.message 
      });
    }
  }
}

module.exports = new QuizController();