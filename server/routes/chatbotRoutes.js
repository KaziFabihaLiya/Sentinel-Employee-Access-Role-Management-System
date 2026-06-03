const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAIResponse } = require('../services/groqService');
const { answerQuestion } = require('../services/chatbotService');

// Determine whether the RAG result has any meaningful context.
// "Low-confidence" means every retrieved doc scored 0 (fallback slice).
const hasContext = (sources = []) => sources.some((source) => source.score > 0);

router.post('/message', protect, async (req, res) => {
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      return res.status(400).json({
        reply: 'Please enter a question about Sentinel EARMS.',
        answer: 'Please enter a question about Sentinel EARMS.',
        message: 'Please enter a question about Sentinel EARMS.',
        sources: [],
        suggestions: [],
        contextUsed: '',
      });
    }

    // --- Step 1: Try the local RAG service first ---
    const ragResult = await answerQuestion(message, req.user);

    // --- Step 2: If context was found, return the RAG answer directly ---
    if (hasContext(ragResult.sources)) {
      return res.json({
        reply: ragResult.answer,
        answer: ragResult.answer,
        message: ragResult.answer,
        sources: ragResult.sources,
        suggestions: ragResult.suggestions || [],
        mode: ragResult.mode || 'local-rag',
      });
    }

    // --- Step 3: No meaningful context — fall back to Groq ---
    const groqAnswer = await getAIResponse(message);

    return res.json({
      reply: groqAnswer,
      answer: groqAnswer,
      message: groqAnswer,
      sources: [],
      suggestions: ragResult.suggestions || [],
      mode: 'groq-fallback',
    });
  } catch (error) {
    console.error('[chatbot] Failed to process chatbot message:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    const finalAnswer = 'I could not process that Sentinel EARMS question right now. Please try again in a moment.';
    return res.status(500).json({
      reply: finalAnswer,
      answer: finalAnswer,
      message: finalAnswer,
      sources: [],
      suggestions: [],
    });
  }
});

router.post('/ask', protect, async (req, res) => {
  try {
    const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // --- Step 1: Try the local RAG service first ---
    const ragResult = await answerQuestion(prompt, req.user);

    // --- Step 2: Return RAG answer if context was found ---
    if (hasContext(ragResult.sources)) {
      return res.json({
        answer: ragResult.answer,
        sources: ragResult.sources,
        suggestions: ragResult.suggestions || [],
        mode: ragResult.mode || 'local-rag',
      });
    }

    // --- Step 3: Fall back to Groq ---
    const groqAnswer = await getAIResponse(prompt);

    return res.json({
      answer: groqAnswer,
      sources: [],
      suggestions: ragResult.suggestions || [],
      mode: 'groq-fallback',
    });
  } catch (error) {
    console.error('[chatbot/ask] Failed to get AI response:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });
    return res.status(500).json({ error: error.message || 'Failed to get AI response' });
  }
});

module.exports = router;