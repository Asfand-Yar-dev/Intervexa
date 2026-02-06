# AI Services Integration Guide

This document explains how to integrate AI models into the Intervexa system.

## Architecture Overview

The application is designed with a modular, plug-and-play architecture for AI services:

```
backend/services/
├── index.js          # Main service aggregator
├── nlpService.js     # NLP/Text analysis (GPT, BERT, etc.)
├── vocalService.js   # Speech/Voice analysis
└── facialService.js  # Facial/Video analysis
```

## Current State (Placeholders)

All AI services currently use **placeholder logic** that returns realistic but simulated scores. This allows the application to function fully while actual AI models are integrated.

## How to Enable Real AI

### Step 1: Set Environment Variables

Add the following to your `backend/.env` file:

```env
# NLP AI Configuration
USE_NLP_AI=true
NLP_AI_ENDPOINT=https://api.openai.com/v1/chat/completions
NLP_AI_API_KEY=your-openai-api-key

# Vocal Analysis Configuration
USE_VOCAL_AI=true
VOCAL_AI_ENDPOINT=https://your-speech-api-endpoint
VOCAL_AI_API_KEY=your-speech-api-key

# Facial Analysis Configuration
USE_FACIAL_AI=true
FACIAL_AI_ENDPOINT=https://your-vision-api-endpoint
FACIAL_AI_API_KEY=your-vision-api-key
```

### Step 2: Implement API Calls

Each service has a `analyzeWithRealAI()` function with TODO comments showing where to add actual API calls.

#### Example: NLP Service with OpenAI

```javascript
// In services/nlpService.js

async function analyzeWithRealAI(text, options = {}) {
  const response = await fetch(CONFIG.AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert interview coach. Analyze the following interview answer and provide scores and feedback.'
        },
        {
          role: 'user',
          content: `Analyze this interview answer:\n\n${text}`
        }
      ],
    }),
  });
  
  const data = await response.json();
  // Parse and return structured results
  return parseOpenAIResponse(data);
}
```

#### Example: Vocal Service with Speech-to-Text

```javascript
// In services/vocalService.js

async function analyzeWithRealAI(audioUrl, options = {}) {
  // Download audio file
  const audioBuffer = await downloadFile(audioUrl);
  
  // Send to speech analysis API (e.g., Google Cloud Speech, AWS Transcribe)
  const transcription = await transcribeAudio(audioBuffer);
  const vocalAnalysis = await analyzeVocalPatterns(audioBuffer);
  
  return {
    score: calculateVocalScore(vocalAnalysis),
    transcription,
    metrics: vocalAnalysis,
    // ... other results
  };
}
```

### Step 3: Test Integration

1. Set `USE_*_AI=true` for one service at a time
2. Monitor logs for errors
3. Verify scores are being saved to the Answer model
4. Check that feedback appears on the results page

## Service Interface

Each AI service must implement this interface:

```javascript
{
  async analyze(data, options) {
    return {
      score: Number (0-100),
      metrics: Object,
      feedback: {
        strengths: Array<string>,
        improvements: Array<string>,
        summary: string,
      },
      isPlaceholder: boolean,
    };
  }
}
```

## Aggregated Analysis

The `services/index.js` file provides an `analyzeAnswer()` function that:

1. Runs all three AI services in parallel
2. Calculates a weighted overall score:
   - NLP (content): 50%
   - Vocal (delivery): 25%
   - Facial (body language): 25%
3. Handles failures gracefully (falls back to placeholders)

## Evaluation Pipeline

When an answer is submitted:

1. **Answer is saved immediately** (no blocking)
2. **AI evaluation triggers asynchronously**
3. **Results are saved back to the Answer document**
4. **User sees updated feedback on refresh**

```
POST /api/answers/submit
    ↓
Save Answer → Return Response (immediate)
    ↓ (async)
triggerAIEvaluation()
    ↓
analyzeAnswer() → NLP + Vocal + Facial
    ↓
Update Answer with scores/feedback
```

## Recommended AI Services

### NLP Analysis
- **OpenAI GPT-4/3.5**: Best for content analysis, STAR method detection
- **Claude**: Alternative for interview coaching prompts
- **Custom BERT**: For specific keyword matching

### Vocal Analysis
- **Google Cloud Speech-to-Text**: Transcription + word timing
- **AWS Transcribe**: Similar capabilities
- **Azure Speech Services**: Real-time or batch processing

### Facial Analysis
- **Azure Face API**: Emotion detection, face tracking
- **AWS Rekognition**: Face analysis, sentiment
- **Google Cloud Vision**: General video analysis

## Error Handling

All AI services are designed to fail gracefully:

1. If AI call fails → Falls back to placeholder
2. If configuration missing → Uses placeholder silently
3. All errors are logged via Winston logger
4. User never sees raw errors (graceful degradation)

## Monitoring & Logging

Track AI service performance with existing logger:

```javascript
logger.info(`AI evaluation completed: score=${score}, service=nlp`);
logger.error(`AI service failed: ${error.message}`);
```

Add metrics tracking as needed:

```javascript
// Example: Track response times
const start = Date.now();
const result = await nlpService.analyze(text);
logger.info(`NLP analysis took ${Date.now() - start}ms`);
```

## Future Enhancements

1. **Batch Processing**: Queue answers for bulk analysis
2. **Caching**: Cache similar answer analyses
3. **Custom Models**: Train on interview-specific data
4. **Real-time Feedback**: WebSocket for live analysis during interview
