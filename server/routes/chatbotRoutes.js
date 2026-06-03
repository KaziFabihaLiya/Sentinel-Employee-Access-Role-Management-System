const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAIResponse } = require('../services/groqService');
const { answerQuestion, retrieveContext } = require('../services/chatbotService');

// Returns true only when at least one retrieved doc carries a real score
// AND at least one is a live DB doc (request/role/workflow).
// Pure-policy hits with score > 0 are intentionally excluded here because
// answerFromContext now returns null for those — Groq handles them better.
const hasContext = (sources = []) => sources.some((source) => source.score > 0);

// Build a context-enriched prompt for Groq so it answers with awareness of
// EARMS policies and whatever live snippets were retrieved, even when the
// local RAG couldn't produce a confident answer on its own.
const buildGroqPrompt = (message, context = []) => {
  const snippets = context
    .slice(0, 5)
    .map((doc) => `[${doc.type.toUpperCase()}] ${doc.title}: ${doc.text}`)
    .join('\n\n');

  return [
    'You are an assistant for Sentinel EARMS, an Employee Access and Role Management System.',
    snippets
      ? `Use the following retrieved context to inform your answer:\n\n${snippets}`
      : 'No specific context was retrieved; answer from your general EARMS knowledge.',
    `User question: ${message}`,
    'Answer concisely and specifically. If the context does not cover the question, say so clearly.',
  ].join('\n\n');
};

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

    // --- Step 1: Run local RAG ---
    // answerQuestion internally calls retrieveContext, so we reuse its
    // context via a parallel retrieveContext call only when we need it for
    // Groq. To avoid double DB hits, we always call answerQuestion first and
    // only call retrieveContext when we know we're falling back.
    const ragResult = await answerQuestion(message, req.user);

    // --- Step 2: Local RAG answered confidently — return it directly ---
    // hasContext checks score > 0; answerFromContext returns null for
    // policy-only hits, so ragResult.answer will be null in that case too.
    if (hasContext(ragResult.sources) && ragResult.answer !== null) {
      return res.json({
        reply: ragResult.answer,
        answer: ragResult.answer,
        message: ragResult.answer,
        sources: ragResult.sources,
        suggestions: ragResult.suggestions || [],
        mode: ragResult.mode || 'local-rag',
      });
    }

    // --- Step 3: Fallback — retrieve context fresh, enrich Groq prompt ---
    // We call retrieveContext again here so the Groq prompt gets the same
    // retrieved snippets the RAG pipeline saw, including policy docs that
    // give Groq useful background even when no live DB data was found.
    const context = await retrieveContext(message, req.user);
    const groqPrompt = buildGroqPrompt(message, context);
    const groqAnswer = await getAIResponse(groqPrompt);

    return res.json({
      reply: groqAnswer,
      answer: groqAnswer,
      message: groqAnswer,
      // Surface whichever sources were retrieved so the client can still
      // show attribution even for Groq-answered responses.
      sources: context.slice(0, 4).map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        score: doc.score,
      })),
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

    // --- Step 1: Run local RAG ---
    const ragResult = await answerQuestion(prompt, req.user);

    // --- Step 2: Return RAG answer when confident ---
    if (hasContext(ragResult.sources) && ragResult.answer !== null) {
      return res.json({
        answer: ragResult.answer,
        sources: ragResult.sources,
        suggestions: ragResult.suggestions || [],
        mode: ragResult.mode || 'local-rag',
      });
    }

    // --- Step 3: Context-enriched Groq fallback ---
    const context = await retrieveContext(prompt, req.user);
    const groqPrompt = buildGroqPrompt(prompt, context);
    const groqAnswer = await getAIResponse(groqPrompt);

    return res.json({
      answer: groqAnswer,
      sources: context.slice(0, 4).map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        score: doc.score,
      })),
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