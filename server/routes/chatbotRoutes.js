const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { answerQuestion, isOllamaConnectionError, isOllamaModelError } = require('../rag/ragService');
const { getAIResponse } = require('../services/ollamaService');

router.post('/message', protect, async (req, res) => {
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) {
      return res.status(400).json({
        reply: 'Please enter a question about Sentinel EARMS.',
        answer: 'Please enter a question about Sentinel EARMS.',
        message: 'Please enter a question about Sentinel EARMS.',
        sources: [],
        contextUsed: '',
      });
    }

    const result = await answerQuestion(message, req.user);

    return res.json({
      reply: result.answer,
      answer: result.answer,
      message: result.answer,
      sources: result.sources,
      contextUsed: result.contextUsed,
    });
  } catch (error) {
    console.error('[chatbot] Failed to process chatbot message:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
    });

    let statusCode = 500;
    let finalAnswer = 'I could not process that Sentinel EARMS question right now. Please try again in a moment.';

    if (isOllamaConnectionError(error)) {
      statusCode = 503;
      finalAnswer = 'I could not reach Ollama. Please make sure Ollama is running locally, then run `ollama pull llama3.2:1b` and `ollama pull nomic-embed-text` if the models are not installed.';
    } else if (isOllamaModelError(error)) {
      statusCode = 503;
      finalAnswer = 'Ollama is running, but a required local model is missing. Please run `ollama pull llama3.2:1b` and `ollama pull nomic-embed-text`, then try again.';
    }

    return res.status(statusCode).json({
      reply: finalAnswer,
      answer: finalAnswer,
      message: finalAnswer,
      sources: [],
      contextUsed: '',
    });
  }
});

router.post('/ask', protect, async (req, res) => {
  try {
    const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const answer = await getAIResponse(prompt);
    return res.json({ answer });
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
