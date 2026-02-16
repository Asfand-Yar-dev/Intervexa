/**
 * =============================================================================
 * AI SERVICES - INDEX
 * =============================================================================
 * 
 * This module exports all AI-related services for the interview system.
 * Services are designed to be plug-and-play for future AI model integration.
 * 
 * SERVICE ARCHITECTURE:
 * Each service follows a consistent interface pattern:
 * - analyze(data): Main analysis method
 * - getScore(): Returns normalized score (0-100)
 * - getFeedback(): Returns structured feedback
 * 
 * HOW TO ADD NEW AI MODELS:
 * 1. Create a new service file (e.g., newAiService.js)
 * 2. Implement the standard interface
 * 3. Export from this index file
 * 4. Inject in the answer evaluation pipeline
 * 
 * @version 1.0.0
 * =============================================================================
 */

const nlpService = require('./nlpService');
const vocalService = require('./vocalService');
const facialService = require('./facialService');

module.exports = {
  nlpService,
  vocalService,
  facialService,

  /**
   * Analyze an interview answer using all AI services
   * @param {Object} answerData - The answer data to analyze
   * @returns {Promise<Object>} Aggregated AI analysis results
   */
  async analyzeAnswer(answerData) {
    const results = await Promise.allSettled([
      nlpService.analyze(answerData.text),
      vocalService.analyze(answerData.audioUrl),
      facialService.analyze(answerData.videoUrl),
    ]);

    const aggregatedResult = {
      nlp: results[0].status === 'fulfilled' ? results[0].value : null,
      vocal: results[1].status === 'fulfilled' ? results[1].value : null,
      facial: results[2].status === 'fulfilled' ? results[2].value : null,

      // Calculate combined score
      overallScore: calculateOverallScore(results),
    };

    // -----------------------------------------------------------------
    // PHASE 5: Save AnswerAnalysis record for result compilation
    // -----------------------------------------------------------------
    // When AI services return real data, uncomment to persist results:
    //
    // if (answerData.answerId && aggregatedResult.overallScore != null) {
    //   const AnswerAnalysis = require('../models/AnswerAnalysis');
    //   await AnswerAnalysis.findOneAndUpdate(
    //     { answerId: answerData.answerId },
    //     {
    //       answerId: answerData.answerId,
    //       confidenceScore: aggregatedResult.vocal?.metrics?.confidence || 0,
    //       clarityScore: aggregatedResult.nlp?.score || 0,
    //       technicalScore: aggregatedResult.nlp?.score || 0,
    //       bodyLanguageScore: aggregatedResult.facial?.metrics?.bodyLanguage || 0,
    //       voiceToneScore: aggregatedResult.vocal?.score || 0,
    //       keywords: [],
    //       strengths: [
    //         ...(aggregatedResult.nlp?.feedback?.strengths || []),
    //         ...(aggregatedResult.vocal?.feedback?.strengths || []),
    //         ...(aggregatedResult.facial?.feedback?.strengths || []),
    //       ],
    //       improvements: [
    //         ...(aggregatedResult.nlp?.feedback?.improvements || []),
    //         ...(aggregatedResult.vocal?.feedback?.improvements || []),
    //         ...(aggregatedResult.facial?.feedback?.improvements || []),
    //       ],
    //       detailedFeedback: `Content: ${aggregatedResult.nlp?.feedback?.summary || 'N/A'}. ` +
    //         `Voice: ${aggregatedResult.vocal?.feedback?.summary || 'N/A'}. ` +
    //         `Visual: ${aggregatedResult.facial?.feedback?.summary || 'N/A'}.`,
    //     },
    //     { upsert: true, new: true }
    //   );
    // }
    // -----------------------------------------------------------------

    return aggregatedResult;
  }
};

/**
 * Calculate weighted overall score from individual analyses
 */
function calculateOverallScore(results) {
  let totalWeight = 0;
  let weightedSum = 0;

  // NLP (content quality) - 50% weight
  if (results[0].status === 'fulfilled' && results[0].value.score != null) {
    weightedSum += results[0].value.score * 0.5;
    totalWeight += 0.5;
  }

  // Vocal analysis - 25% weight
  if (results[1].status === 'fulfilled' && results[1].value.score != null) {
    weightedSum += results[1].value.score * 0.25;
    totalWeight += 0.25;
  }

  // Facial analysis - 25% weight
  if (results[2].status === 'fulfilled' && results[2].value.score != null) {
    weightedSum += results[2].value.score * 0.25;
    totalWeight += 0.25;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
}
