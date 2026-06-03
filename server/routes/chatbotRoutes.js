const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAIResponse } = require('../services/groqService');

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

    const answer = await getAIResponse(message);

    return res.json({
      reply: answer,
      answer,
      message: answer,
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
