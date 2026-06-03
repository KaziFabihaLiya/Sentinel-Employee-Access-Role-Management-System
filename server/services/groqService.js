const axios = require('axios');

const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.ai/v1/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';
const TIMEOUT_MS = 300000;

const normalizeGroqResponse = (data) => {
  if (!data) return null;
  if (Array.isArray(data.choices) && data.choices[0]) {
    if (typeof data.choices[0].text === 'string') return data.choices[0].text;
    if (typeof data.choices[0].message?.content === 'string') return data.choices[0].message.content;
  }
  if (typeof data.text === 'string') return data.text;
  return null;
};

const getAIResponse = async (prompt, model = DEFAULT_MODEL) => {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required');
  }

  const payload = {
    model,
    prompt,
    max_tokens: 256,
    temperature: 0.2,
    top_p: 0.95,
    stream: false,
    stop: null,
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  if (process.env.GROQ_API_KEY) {
    headers.Authorization = `Bearer ${process.env.GROQ_API_KEY}`;
  }

  const response = await axios.post(GROQ_API_URL, payload, {
    headers,
    timeout: TIMEOUT_MS,
  });

  const answer = normalizeGroqResponse(response.data);
  if (!answer) {
    const errorDetails = JSON.stringify(response.data || {});
    throw new Error(`Unexpected Groq response format: ${errorDetails}`);
  }

  return answer.trim();
};

module.exports = { getAIResponse };
