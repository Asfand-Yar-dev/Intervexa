/**
 * Question Routes
 * Handles interview question management
 */

const express = require('express');
const Question = require('../models/Question');
const { HTTP_STATUS, DIFFICULTY_LEVELS } = require('../config/constants');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { addQuestionValidation } = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   GET /api/questions
 * @desc    Get all questions with optional filters
 * @access  Public (or Private depending on your needs)
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const { category, difficulty, limit = 20, page = 1, search } = req.query;
  
  const query = { isActive: true };
  
  // Apply filters
  if (category) {
    query.category = { $regex: category, $options: 'i' };
  }
  
  if (difficulty && Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    query.difficulty = difficulty;
  }
  
  if (search) {
    query.questionText = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const questions = await Question.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-expectedAnswer'); // Don't expose expected answers

  const total = await Question.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      questions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

/**
 * @route   GET /api/questions/categories
 * @desc    Get all unique question categories
 * @access  Public
 */
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Question.distinct('category', { isActive: true });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: categories
  });
}));

/**
 * @route   GET /api/questions/random
 * @desc    Get random questions for an interview
 * @access  Private
 */
router.get('/random', authenticate, asyncHandler(async (req, res) => {
  const { count = 5, category, difficulty } = req.query;
  
  const query = { isActive: true };
  
  if (category) {
    query.category = category;
  }
  
  if (difficulty && Object.values(DIFFICULTY_LEVELS).includes(difficulty)) {
    query.difficulty = difficulty;
  }

  const questions = await Question.aggregate([
    { $match: query },
    { $sample: { size: parseInt(count) } },
    { $project: { expectedAnswer: 0 } } // Don't expose expected answers
  ]);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: questions
  });
}));

/**
 * @route   GET /api/questions/:id
 * @desc    Get a specific question
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id)
    .select('-expectedAnswer');

  if (!question) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Question not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: question
  });
}));

/**
 * @route   POST /api/questions/add
 * @desc    Add a new question
 * @access  Private (should be Admin only in production)
 */
router.post('/add', authenticate, addQuestionValidation, asyncHandler(async (req, res) => {
  const { questionText, category, difficulty, expectedAnswer, keywords, timeLimit } = req.body;

  const question = new Question({
    questionText,
    category,
    difficulty: difficulty || DIFFICULTY_LEVELS.MEDIUM,
    expectedAnswer,
    keywords: keywords || [],
    timeLimit: timeLimit || 120
  });

  await question.save();

  logger.info(`New question added: ${question._id} in category: ${category}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Question added successfully',
    data: question
  });
}));

/**
 * @route   PUT /api/questions/:id
 * @desc    Update a question
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { questionText, category, difficulty, expectedAnswer, keywords, timeLimit, isActive } = req.body;

  const question = await Question.findById(req.params.id);

  if (!question) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Question not found');
  }

  // Update fields if provided
  if (questionText) question.questionText = questionText;
  if (category) question.category = category;
  if (difficulty) question.difficulty = difficulty;
  if (expectedAnswer !== undefined) question.expectedAnswer = expectedAnswer;
  if (keywords) question.keywords = keywords;
  if (timeLimit) question.timeLimit = timeLimit;
  if (isActive !== undefined) question.isActive = isActive;

  await question.save();

  logger.info(`Question updated: ${question._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Question updated successfully',
    data: question
  });
}));

/**
 * @route   DELETE /api/questions/:id
 * @desc    Soft delete a question (set isActive to false)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);

  if (!question) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Question not found');
  }

  // Soft delete
  question.isActive = false;
  await question.save();

  logger.info(`Question soft deleted: ${question._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Question deleted successfully'
  });
}));

module.exports = router;
