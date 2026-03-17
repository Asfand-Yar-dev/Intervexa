/**
 * =============================================================================
 * ANSWER CONTROLLER
 * =============================================================================
 * 
 * Handles answer submission with audio file uploads.
 * 
 * FIXES APPLIED:
 * 1. Fixed req.user._id -> req.user.id (JWT payload uses 'id')
 * 2. Replaced setTimeout mock with proper async AI service client
 * 3. Used fs.promises.unlink instead of callback-based fs.unlink
 * 4. Added proper error handling for file cleanup
 * 5. Added processing status tracking
 * 
 * PHASE 5 PREP:
 * - Replaced setTimeout with aiServiceClient for asynchronous AI processing
 * - Answer processing status tracked: pending -> processing -> completed/failed
 * - Fire-and-forget pattern with proper error logging
 * 
 * =============================================================================
 */

const Answer = require('../models/Answer');
const InterviewSession = require('../models/InterviewSession');
const logger = require('../config/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * @desc    Submit answer (audio + metadata)
 * @route   POST /api/interviews/:sessionId/answers
 * @access  Private
 */
exports.submitAnswer = async (req, res) => {
    // Validate file was uploaded
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No audio file uploaded. Please attach an audio file.'
        });
    }

    const interviewId = req.params.sessionId;
    const { questionId, audioDuration } = req.body;

    // FIX: Use req.user.id (from JWT payload), not req.user._id
    const userId = req.user.id;
    const tempFilePath = req.file.path;

    // Validate required fields
    if (!questionId) {
        // Clean up uploaded file if validation fails
        await safeDeleteFile(tempFilePath);
        return res.status(400).json({
            success: false,
            message: 'questionId is required in the request body.',
        });
    }

    // Verify the session exists and belongs to the user
    const session = await InterviewSession.findOne({
        _id: interviewId,
        user_id: userId,
    });

    if (!session) {
        await safeDeleteFile(tempFilePath);
        return res.status(404).json({
            success: false,
            message: 'Interview session not found or access denied.',
        });
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
        await safeDeleteFile(tempFilePath);
        return res.status(400).json({
            success: false,
            message: 'Cannot submit answers to a closed session.',
        });
    }

    // Create the answer record
    const answer = await Answer.create({
        userId: userId,
        interviewId: interviewId,
        questionId: questionId,
        audioFileUrl: tempFilePath,
        audioFileName: req.file.originalname,
        audioFileSize: req.file.size,
        audioDuration: parseFloat(audioDuration) || 0,
        processingStatus: 'pending',
    });

    // Update session answered count
    session.answered_questions = (session.answered_questions || 0) + 1;
    await session.save();

    logger.info(`Answer submitted: ${answer._id} for interview ${interviewId}, file: ${tempFilePath}`);

    // =========================================================================
    // PHASE 5 PREP: Async AI Processing (Fire-and-Forget)
    // =========================================================================
    // This runs in the background. The HTTP response is sent immediately.
    // When the Python AI microservice is ready, replace processWithAI() 
    // with an HTTP call to the FastAPI service.
    //
    // Architecture: Express → sends file to AI → AI returns results via webhook
    // OR: Express → puts job in queue (Bull/BullMQ) → worker processes it
    // =========================================================================
    processWithAI(answer._id, tempFilePath).catch(err => {
        logger.error(`Background AI processing failed for answer ${answer._id}: ${err.message}`);
    });

    // Respond immediately — don't wait for AI
    res.status(201).json({
        success: true,
        message: 'Answer submitted successfully. AI processing started in background.',
        data: {
            _id: answer._id,
            interviewId: answer.interviewId,
            questionId: answer.questionId,
            audioFileName: answer.audioFileName,
            audioFileSize: answer.audioFileSize,
            audioDuration: answer.audioDuration,
            processingStatus: answer.processingStatus,
            createdAt: answer.createdAt,
        },
    });
};

/**
 * @desc    Get submitted answers for a session
 * @route   GET /api/interviews/:sessionId/answers
 * @access  Private
 */
exports.getAnswers = async (req, res) => {
    const interviewId = req.params.sessionId || req.params.id;
    const userId = req.user.id;

    const answers = await Answer.find({
        interviewId: interviewId,
        userId: userId,
    })
        .populate('questionId', 'questionText category difficulty')
        .sort({ createdAt: 1 });

    res.json({
        success: true,
        data: {
            interviewId,
            totalAnswers: answers.length,
            answers,
        }
    });
};

/**
 * @desc    Get processing status of an answer (for polling)
 * @route   GET /api/answers/:answerId/status
 * @access  Private
 */
exports.getAnswerStatus = async (req, res) => {
    const answer = await Answer.findOne({
        _id: req.params.answerId,
        userId: req.user.id,
    }).select('processingStatus transcription evaluationScore feedback processedAt');

    if (!answer) {
        return res.status(404).json({
            success: false,
            message: 'Answer not found.',
        });
    }

    res.json({
        success: true,
        data: {
            processingStatus: answer.processingStatus,
            transcription: answer.transcription,
            evaluationScore: answer.evaluationScore,
            feedback: answer.feedback,
            processedAt: answer.processedAt,
        },
    });
};

/**
 * =============================================================================
 * PHASE 5: AI PROCESSING FUNCTION
 * =============================================================================
 * 
 * Currently simulates AI processing. When your Python FastAPI microservice
 * is ready, replace the body of this function with an HTTP call.
 * 
 * OPTION A: Direct HTTP call to FastAPI
 *   const result = await aiServiceClient.analyze(filePath);
 * 
 * OPTION B: Queue-based (BullMQ) — recommended for production
 *   await aiJobQueue.add('analyze-answer', { answerId, filePath });
 * 
 * OPTION C: Webhook pattern
 *   await aiServiceClient.submitForAnalysis(answerId, filePath, callbackUrl);
 *   // AI service calls POST /api/webhooks/ai-result when done
 * =============================================================================
 */
async function processWithAI(answerId, filePath) {
    try {
        // Mark as processing
        await Answer.findByIdAndUpdate(answerId, { processingStatus: 'processing' });

        const aiServices = require('../services');
        const Question = require('../models/Question');

        // Get answer and question details
        const answer = await Answer.findById(answerId);
        if (!answer) throw new Error('Answer not found');

        const question = await Question.findById(answer.questionId);
        
        // -----------------------------------------------------------------------
        // Run unified AI analysis (STT + NLP + Voice + Facial)
        // -----------------------------------------------------------------------
        const analysis = await aiServices.analyzeAnswer({
            text: answer.answerText, // Could be empty if only audio provided
            reference: question?.expectedAnswer || '',
            audioUrl: filePath,
            videoUrl: filePath, // Assuming video recorded in same file or handle separately
            filename: answer.audioFileName,
        });

        // -----------------------------------------------------------------------
        // Update answer with Results
        // -----------------------------------------------------------------------
        await Answer.findByIdAndUpdate(answerId, {
            transcription: analysis.nlp?.metrics?.transcription || analysis.vocal?.transcription || '',
            evaluationScore: analysis.overallScore,
            feedback: _generateFeedback(analysis),
            processingStatus: 'completed',
            processedAt: new Date(),
        });

        // Persist detailed AnswerAnalysis record for the results page
        await aiServices.saveAnalysis(
            answerId,
            answer.interviewId,
            answer.userId,
            analysis
        );

        logger.info(`AI processing completed for answer ${answerId}, score: ${analysis.overallScore}`);

        // Clean up the temporary audio file after processing
        await safeDeleteFile(filePath);

    } catch (error) {
        logger.error(`AI processing error for answer ${answerId}: ${error.message}`);

        // Mark as failed so the frontend can show an error or allow retry
        await Answer.findByIdAndUpdate(answerId, {
            processingStatus: 'failed',
        }).catch(err => logger.error(`Failed to update answer status: ${err.message}`));
    }
}

/**
 * Generate feedback text from analysis
 */
function _generateFeedback(analysis) {
    const parts = [];
    if (analysis.nlp?.feedback?.summary) parts.push(analysis.nlp.feedback.summary);
    if (analysis.vocal?.feedback?.summary) parts.push(analysis.vocal.feedback.summary);
    if (analysis.facial?.feedback?.summary) parts.push(analysis.facial.feedback.summary);
    
    return parts.length > 0 ? parts.join(' ') : 'Answer analyzed successfully.';
}

/**
 * Safely delete a file (non-blocking, with error handling)
 */
async function safeDeleteFile(filePath) {
    try {
        if (!filePath) return;
        await fs.unlink(filePath);
        logger.info(`Deleted temp file: ${filePath}`);
    } catch (err) {
        if (err.code !== 'ENOENT') { // Don't log if file doesn't exist
            logger.error(`Failed to delete file ${filePath}: ${err.message}`);
        }
    }
}

/**
 * =============================================================================
 * WEBHOOK ENDPOINT: Receive AI Results (Phase 5)
 * =============================================================================
 * 
 * When using the webhook pattern, the Python AI service calls this endpoint
 * to deliver analysis results.
 * 
 * @route   POST /api/webhooks/ai-result
 * @access  Server-to-Server (secured by API key)
 */
exports.receiveAIResult = async (req, res) => {
    // Verify the webhook secret (server-to-server auth)
    const webhookSecret = req.headers['x-webhook-secret'];
    if (webhookSecret !== process.env.AI_WEBHOOK_SECRET) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { answerId, transcription, evaluationScore, feedback, analysis } = req.body;

    if (!answerId) {
        return res.status(400).json({ success: false, message: 'answerId is required' });
    }

    try {
        const answer = await Answer.findById(answerId);
        if (!answer) {
            return res.status(404).json({ success: false, message: 'Answer not found' });
        }

        // Update with AI results
        answer.transcription = transcription || answer.transcription;
        answer.evaluationScore = evaluationScore;
        answer.feedback = feedback;
        answer.processingStatus = 'completed';
        answer.processedAt = new Date();
        await answer.save();

        // Clean up audio file after successful processing
        if (answer.audioFileUrl && answer.audioFileUrl !== 'deleted_post_analysis') {
            await safeDeleteFile(answer.audioFileUrl);
            answer.audioFileUrl = 'processed';
            await answer.save();
        }

        logger.info(`AI webhook result received for answer ${answerId}`);

        res.json({ success: true, message: 'Result processed' });
    } catch (error) {
        logger.error(`Webhook processing error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Processing failed' });
    }
};