/**
 * =============================================================================
 * AI SERVICE CLIENT
 * =============================================================================
 * 
 * HTTP client for communicating with the Python AI microservice (FastAPI/Flask).
 * 
 * FEATURES:
 * - Circuit breaker pattern (fails fast when AI is down)
 * - Exponential backoff retry logic
 * - Request timeout handling
 * - Structured error responses
 * 
 * USAGE:
 *   const aiClient = require('./services/aiServiceClient');
 *   
 *   // Analyze audio
 *   const result = await aiClient.analyzeAudio(filePath, options);
 *   
 *   // Transcribe audio
 *   const transcript = await aiClient.transcribeAudio(filePath);
 *   
 *   // Generate questions
 *   const questions = await aiClient.generateQuestions({ jobTitle, skills });
 * 
 * CONFIGURATION (.env):
 *   AI_SERVICE_URL=http://localhost:8000
 *   AI_SERVICE_API_KEY=your-api-key
 *   AI_SERVICE_TIMEOUT=30000
 *   AI_WEBHOOK_SECRET=your-webhook-secret
 * 
 * @version 1.0.0
 * =============================================================================
 */

const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    baseUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_SERVICE_API_KEY || '',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000, // 30 seconds
    maxRetries: parseInt(process.env.AI_SERVICE_MAX_RETRIES) || 3,

    // Circuit breaker settings
    circuitBreaker: {
        failureThreshold: 5,      // Open circuit after 5 consecutive failures
        recoveryTimeout: 60000,   // Try again after 60 seconds
    },
};

// =============================================================================
// CIRCUIT BREAKER STATE
// =============================================================================

const circuitState = {
    failures: 0,
    lastFailure: null,
    isOpen: false,
};

function checkCircuitBreaker() {
    if (!circuitState.isOpen) return true;

    // Check if recovery timeout has elapsed
    const timeSinceFailure = Date.now() - circuitState.lastFailure;
    if (timeSinceFailure > CONFIG.circuitBreaker.recoveryTimeout) {
        logger.info('Circuit breaker: Half-open — attempting recovery');
        circuitState.isOpen = false;
        circuitState.failures = 0;
        return true;
    }

    return false; // Circuit is still open
}

function recordFailure() {
    circuitState.failures++;
    circuitState.lastFailure = Date.now();

    if (circuitState.failures >= CONFIG.circuitBreaker.failureThreshold) {
        circuitState.isOpen = true;
        logger.error(`Circuit breaker OPEN: AI service has failed ${circuitState.failures} times`);
    }
}

function recordSuccess() {
    circuitState.failures = 0;
    circuitState.isOpen = false;
}

// =============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// =============================================================================

async function fetchWithRetry(url, options, retries = CONFIG.maxRetries) {
    if (!checkCircuitBreaker()) {
        throw new Error('AI service circuit breaker is open. Service is temporarily unavailable.');
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text().catch(() => 'No response body');
                throw new Error(`AI service returned ${response.status}: ${errorBody}`);
            }

            const result = await response.json();
            recordSuccess();
            return result;

        } catch (error) {
            const isLastAttempt = attempt === retries;

            if (error.name === 'AbortError') {
                logger.warn(`AI service timeout (attempt ${attempt}/${retries})`);
            } else {
                logger.warn(`AI service error (attempt ${attempt}/${retries}): ${error.message}`);
            }

            if (isLastAttempt) {
                recordFailure();
                throw error;
            }

            // Exponential backoff: 1s, 2s, 4s, 8s...
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// =============================================================================
// AI SERVICE METHODS
// =============================================================================

/**
 * Analyze an audio recording and get transcription + evaluation
 * 
 * @param {string} filePath - Absolute path to the audio file
 * @param {Object} options - Additional options
 * @param {string} options.questionText - The question that was asked
 * @param {string} options.category - Question category
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeAudio(filePath, options = {}) {
    const formData = new FormData();

    // Read the file as a blob for multipart upload
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append('audio', blob, path.basename(filePath));

    if (options.questionText) formData.append('question_text', options.questionText);
    if (options.category) formData.append('category', options.category);

    return await fetchWithRetry(`${CONFIG.baseUrl}/api/analyze-audio`, {
        method: 'POST',
        headers: {
            'X-API-Key': CONFIG.apiKey,
        },
        body: formData,
    });
}

/**
 * Transcribe audio to text only
 * 
 * @param {string} filePath - Absolute path to the audio file
 * @returns {Promise<Object>} { transcription: string }
 */
async function transcribeAudio(filePath) {
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append('audio', blob, path.basename(filePath));

    return await fetchWithRetry(`${CONFIG.baseUrl}/api/transcribe`, {
        method: 'POST',
        headers: {
            'X-API-Key': CONFIG.apiKey,
        },
        body: formData,
    });
}

/**
 * Generate interview questions using AI
 * 
 * @param {Object} params
 * @param {string} params.jobTitle - Target job position
 * @param {string[]} params.skills - Required skills
 * @param {string} params.difficulty - easy/medium/hard
 * @param {number} params.count - Number of questions
 * @returns {Promise<Object>} { questions: Array }
 */
async function generateQuestions(params) {
    return await fetchWithRetry(`${CONFIG.baseUrl}/api/generate-questions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.apiKey,
        },
        body: JSON.stringify({
            job_title: params.jobTitle,
            skills: params.skills || [],
            difficulty: params.difficulty || 'medium',
            count: params.count || 5,
        }),
    });
}

/**
 * Submit audio for async analysis (webhook pattern)
 * AI service will call back to our webhook when done
 * 
 * @param {string} answerId - Answer record ID
 * @param {string} filePath - Audio file path
 * @param {string} callbackUrl - Webhook URL for results
 */
async function submitForAsyncAnalysis(answerId, filePath, callbackUrl) {
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append('audio', blob, path.basename(filePath));
    formData.append('answer_id', answerId);
    formData.append('callback_url', callbackUrl);

    return await fetchWithRetry(`${CONFIG.baseUrl}/api/analyze-async`, {
        method: 'POST',
        headers: {
            'X-API-Key': CONFIG.apiKey,
        },
        body: formData,
    });
}

/**
 * Health check for AI service (used by circuit breaker recovery)
 */
async function healthCheck() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${CONFIG.baseUrl}/health`, {
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get circuit breaker status (for monitoring)
 */
function getStatus() {
    return {
        isAvailable: !circuitState.isOpen,
        failures: circuitState.failures,
        lastFailure: circuitState.lastFailure,
        baseUrl: CONFIG.baseUrl,
    };
}

module.exports = {
    analyzeAudio,
    transcribeAudio,
    generateQuestions,
    submitForAsyncAnalysis,
    healthCheck,
    getStatus,
    CONFIG,
};
