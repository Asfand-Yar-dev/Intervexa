/**
 * =============================================================================
 * FACIAL SERVICE — Real AI Integration
 * =============================================================================
 *
 * Calls the Python AI Gateway's /api/ai/analyze-face endpoint
 * to evaluate facial expressions and body language from video
 * using DeepFace + OpenCV.
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
 * Analyze facial expressions and body language from video.
 *
 * @param {Object}  params
 * @param {string}  [params.videoUrl]    – URL or local path to video
 * @param {Buffer}  [params.videoBuffer] – Raw video buffer (from multer)
 * @param {string}  [params.filename]    – Original filename (for extension)
 * @returns {Promise<Object>}            – { score, metrics, feedback }
 */
async function analyzeFacial({ videoUrl, videoBuffer, filename = 'video.webm' }) {
  // No video provided -> do not fabricate a body-language score.
  if (!videoUrl && !videoBuffer) {
    return null;
  }

  // -----------------------------------------------------------------------
  // Try real AI service (if enabled and video data exists)
  // -----------------------------------------------------------------------
  if (USE_REAL_AI && (videoUrl || videoBuffer)) {
    try {
      const formData = new FormData();

      if (videoBuffer) {
        const blob = new Blob([videoBuffer], { type: 'video/webm' });
        formData.append('video', blob, filename);
      } else if (videoUrl && fs.existsSync(videoUrl)) {
        const buffer = fs.readFileSync(videoUrl);
        const ext = path.extname(videoUrl) || '.webm';
        const blob = new Blob([buffer], { type: `video/${ext.replace('.', '')}` });
        formData.append('video', blob, path.basename(videoUrl));
      }

      if (formData.has('video')) {
        const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze-face`, {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(120000), // 2-minute timeout (video processing is slow)
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            logger.info(`Facial AI analysis completed: overall=${result.overall_score}`);

            return {
              score: Math.round(result.overall_score || 0),
              metrics: {
                eyeContact: Math.round(result.avg_eye_contact || 0),
                bodyLanguage: Math.round(result.avg_engagement || 0),
                confidence: Math.round(result.avg_confidence || 0),
                nervousness: Math.round(result.avg_nervousness || 0),
                facePresence: Math.round(result.face_presence_rate || 0),
              },
              feedback: {
                summary: _summariseFacial(result),
                confidenceFeedback: result.confidence_feedback || '',
                nervousnessFeedback: result.nervousness_feedback || '',
                engagementFeedback: result.engagement_feedback || '',
                eyeContactFeedback: result.eye_contact_feedback || '',
                overallFeedback: result.overall_feedback || '',
                strengths: _facialStrengths(result),
                improvements: _facialImprovements(result),
              },
              emotionDistribution: result.emotion_distribution || {},
            };
          }
        }
        logger.warn('Facial AI returned non-success, falling back to heuristic');
      }
    } catch (error) {
      logger.warn(`Facial AI service unreachable: ${error.message}. Using heuristic.`);
    }
  }

  // -----------------------------------------------------------------------
  // Fallback: conservative placeholder only when video exists but AI failed.
  // -----------------------------------------------------------------------
  return _heuristicFacial();
}

// =========================================================================
// Summarise facial analysis
// =========================================================================

function _summariseFacial(result) {
  const score = result.overall_score || 0;
  if (score >= 80) return 'Excellent facial presence! You maintained strong eye contact and confident expressions.';
  if (score >= 60) return 'Good facial engagement. Minor improvements in eye contact and expression variety could help.';
  if (score >= 40) return 'Moderate facial engagement. Work on maintaining eye contact and showing more confidence.';
  return 'Facial analysis shows room for improvement. Practice looking at the camera and maintaining composure.';
}

function _facialStrengths(result) {
  const strengths = [];
  if ((result.avg_eye_contact || 0) >= 70) strengths.push('Strong eye contact with the camera');
  if ((result.avg_confidence || 0) >= 70) strengths.push('Confident facial expressions');
  if ((result.avg_engagement || 0) >= 70) strengths.push('Engaged and expressive');
  if ((result.avg_nervousness || 0) < 30) strengths.push('Calm and composed demeanor');
  if (strengths.length === 0) strengths.push('Video was captured successfully');
  return strengths;
}

function _facialImprovements(result) {
  const improvements = [];
  if ((result.avg_eye_contact || 0) < 60) improvements.push('Maintain consistent eye contact with the camera');
  if ((result.avg_confidence || 0) < 50) improvements.push('Practice projecting confidence through facial expressions');
  if ((result.avg_nervousness || 0) > 50) improvements.push('Work on reducing visible nervousness — try deep breathing');
  if ((result.face_presence_rate || 0) < 70) improvements.push('Stay centered in the camera frame throughout');
  if (improvements.length === 0) improvements.push('Continue practicing for consistency');
  return improvements;
}

// =========================================================================
// Heuristic fallback
// =========================================================================

function _heuristicFacial() {
  const baseScore = 0;
  return {
    score: baseScore,
    metrics: {
      eyeContact: 0,
      bodyLanguage: 0,
      confidence: 0,
      nervousness: 0,
      facePresence: 0,
    },
    feedback: {
      summary: 'Facial analysis unavailable for this answer.',
      confidenceFeedback: '',
      nervousnessFeedback: '',
      engagementFeedback: '',
      eyeContactFeedback: '',
      overallFeedback: '',
      strengths: [],
      improvements: ['Ensure camera is on and AI gateway facial model is available.'],
    },
    emotionDistribution: {},
  };
}

module.exports = { analyzeFacial };
