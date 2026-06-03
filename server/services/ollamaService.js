const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL
  || (OLLAMA_BASE_URL ? `${OLLAMA_BASE_URL.replace(/\/+$|\/$/, '')}/api/generate` : null)
  || 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = process.env.OLLAMA_GENERATION_MODEL || 'llama3.2:1b';

const normalizeOllamaResponse = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.generated_text === 'string') return data.generated_text;
  if (Array.isArray(data.output)) {
    if (typeof data.output[0]?.generated_text === 'string') return data.output[0].generated_text;
    if (typeof data.output[0]?.text === 'string') return data.output[0].text;
  }
  if (Array.isArray(data.results) && typeof data.results[0]?.output === 'string') {
    return data.results[0].output;
  }
  if (Array.isArray(data.data)) {
    if (typeof data.data[0] === 'string') return data.data[0];
    if (typeof data.data[0]?.generated_text === 'string') return data.data[0].generated_text;
    if (typeof data.data[0]?.text === 'string') return data.data[0].text;
  }
  return null;
};

const getAIResponse = async (prompt, model = DEFAULT_MODEL) => {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required');
  }

  const payload = {
    model,
    prompt,
    stream: false,
    options: {
      num_predict: 100,
    },
  };

  const response = await axios.post(OLLAMA_API_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 300000,
  });

  const answer = normalizeOllamaResponse(response.data);
  if (!answer) {
    throw new Error('Unexpected response from Ollama endpoint');
  }

  return answer;
};

module.exports = { getAIResponse };