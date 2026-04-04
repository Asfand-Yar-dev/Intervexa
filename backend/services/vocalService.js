/**
 * =============================================================================
 * VOCAL SERVICE — Real AI Integration
 * =============================================================================
 *
 * Calls the Python AI Gateway's /api/ai/analyze-voice endpoint
 * to evaluate vocal characteristics using Wav2Vec2 + librosa.
 *
 * Falls back to heuristic scoring when USE_REAL_AI is false or
 * the AI Gateway is unreachable.
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const USE_REAL_AI = !['false', '0', 'no'].includes(
  String(process.env.USE_REAL_AI || 'true').toLowerCase()
);

/**
 * Analyze vocal characteristics from an audio file or URL.
 *
 * @param {Object}  params
 * @param {string}  [params.audioUrl]   – URL or local path to the audio file
 * @param {Buffer}  [params.audioBuffer] – Raw audio buffer (from multer)
 * @param {string}  [params.filename]   – Original filename (for extension)
 * @returns {Promise<Object>}           – { score, metrics, feedback }
 */
async function analyzeVocal({ audioUrl, audioBuffer, filename = 'audio.webm' }) {
  // -----------------------------------------------------------------------
  // Try real AI service first (if enabled and audio data exists)
  // -----------------------------------------------------------------------
  if (USE_REAL_AI && (audioUrl || audioBuffer)) {
    try {
      const formData = new FormData();

      if (audioBuffer) {
        // Send raw buffer as a file
        const blob = new Blob([audioBuffer], { type: 'audio/webm' });
        formData.append('audio', blob, filename);
      } else if (audioUrl && fs.existsSync(audioUrl)) {
        // Read from local path
        const buffer = fs.readFileSync(audioUrl);
        const ext = path.extname(audioUrl) || '.webm';
        const blob = new Blob([buffer], { type: `audio/${ext.replace('.', '')}` });
        formData.append('audio', blob, path.basename(audioUrl));
      }

      if (formData.has('audio')) {
        // Use quick mode for faster response
        formData.append('quick', 'true');

        const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze-voice`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(60000), // 60-second timeout
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            logger.info(`Vocal AI analysis completed: overall=${result.overall_score}`);

            const clarityConf = result.clarity_confidence || {};
            const tone = result.tone || {};
            const hesitation = result.hesitation_stress || {};

            return {
              score: Math.round(result.overall_score || 0),
              metrics: {
                confidence: Math.round(clarityConf.confidence_score || 0),
                clarity: Math.round(clarityConf.clarity_score || 0),
                pace: Math.round(100 - (hesitation.hesitation_score || 0)),
                tone: Math.round(tone.tone_score || 0),
                stress: Math.round(hesitation.stress_score || 0),
              },
              feedback: {
                summary: _summariseVocal(result),
                details: result.feedback || [],
                strengths: _vocalStrengths(result),
                improvements: _vocalImprovements(result),
              },
            };
          }
        }
        logger.warn('Vocal AI returned non-success, falling back to heuristic');
      }
    } catch (error) {
      logger.warn(`Vocal AI service unreachable: ${error.message}. Using heuristic.`);
    }

    // Real-AI mode: do not return synthetic vocal scores on gateway failure.
    return {
      score: 0,
      metrics: {
        confidence: 0,
        clarity: 0,
        pace: 0,
        tone: 0,
        stress: 0,
      },
      feedback: {
        summary: 'Vocal analysis service is unavailable right now.',
        details: [],
        strengths: [],
        improvements: ['Try again after AI services are fully loaded.'],
      },
    };
  }

  // -----------------------------------------------------------------------
  // Fallback: Heuristic-based placeholder
  // -----------------------------------------------------------------------
  return _heuristicVocal();
}

// =========================================================================
// Summarise vocal analysis into a single sentence
// =========================================================================

function _summariseVocal(result) {
  const score = result.overall_score || 0;
  if (score >= 80) return 'Your vocal delivery was strong, clear, and confident.';
  if (score >= 60) return 'Your vocal delivery was fair. Work on maintaining a steadier pace and tone.';
  if (score >= 40) return 'Your vocal delivery needs improvement. Focus on clarity and reducing hesitations.';
  return 'Significant vocal issues detected. Practice speaking slowly and clearly.';
}

function _vocalStrengths(result) {
  const strengths = [];
  const cc = result.clarity_confidence || {};
  const tone = result.tone || {};
  if ((cc.confidence_score || 0) >= 70) strengths.push('Confident vocal delivery');
  if ((cc.clarity_score || 0) >= 70) strengths.push('Clear articulation');
  if ((tone.tone_score || 0) >= 70) strengths.push('Engaging vocal tone');
  if (strengths.length === 0) strengths.push('Attempted vocal response');
  return strengths;
}

function _vocalImprovements(result) {
  const improvements = [];
  const cc = result.clarity_confidence || {};
  const hs = result.hesitation_stress || {};
  const tone = result.tone || {};
  if ((cc.clarity_score || 0) < 60) improvements.push('Improve speech clarity and enunciation');
  if ((hs.hesitation_score || 0) > 50) improvements.push('Reduce pauses and hesitations');
  if ((hs.stress_score || 0) > 50) improvements.push('Practice deep breathing to reduce vocal stress');
  if ((tone.details?.monotone_level || 0) > 60) improvements.push('Add more vocal variety — avoid monotone delivery');
  if (improvements.length === 0) improvements.push('Continue practicing for consistency');
  return improvements;
}

// =========================================================================
// Heuristic fallback (when AI is not available)
// =========================================================================

function _heuristicVocal() {
  // Return moderate placeholder scores
  const baseScore = 65;
  return {
    score: baseScore,
    metrics: {
      confidence: 65,
      clarity: 70,
      pace: 68,
      tone: 62,
      stress: 30,
    },
    feedback: {
      summary: 'Vocal analysis processed with heuristic scoring. Enable AI for detailed analysis.',
      details: ['Enable the AI gateway for real vocal analysis.'],
      strengths: ['Audio was captured successfully'],
      improvements: ['Enable real AI for detailed vocal feedback'],
    },
  };
}

module.exports = { analyzeVocal };
