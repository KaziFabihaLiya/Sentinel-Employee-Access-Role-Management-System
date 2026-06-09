// const axios = require('axios');

// const HF_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
// const HF_API_KEY = process.env.HF_API_KEY;

// /**
//  * Get embedding vector for a single text string.
//  * Returns a 384-dimension float array.
//  */
// const getEmbedding = async (text) => {
//   if (!HF_API_KEY) throw new Error('HF_API_KEY is not set');

//   const response = await axios.post(
//     HF_API_URL,
//     { inputs: text },
//     {
//       headers: {
//         Authorization: `Bearer ${HF_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       timeout: 30000,
//     }
//   );

//   // HF returns nested array for batch, flat array for single input
//   const data = response.data;
//   if (Array.isArray(data[0])) return data[0];
//   return data;
// };

// /**
//  * Get embeddings for multiple texts in one API call (batch).
//  * Returns array of 384-dimension float arrays.
//  */
// const getEmbeddings = async (texts) => {
//   if (!HF_API_KEY) throw new Error('HF_API_KEY is not set');
//   if (!texts.length) return [];

//   const response = await axios.post(
//     HF_API_URL,
//     { inputs: texts },
//     {
//       headers: {
//         Authorization: `Bearer ${HF_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       timeout: 60000,
//     }
//   );

//   return response.data;
// };

// module.exports = { getEmbedding, getEmbeddings };
const axios = require('axios');

const getEmbedding = async (text) => {
  
  const response = await axios.post(
    'https://api.cohere.com/v1/embed',
    {
      texts: [text],
      model: 'embed-english-light-v3.0',
      input_type: 'search_document',
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return response.data.embeddings[0];
};

const getEmbeddings = async (texts) => {
  const response = await axios.post(
    'https://api.cohere.com/v1/embed',
    {
      texts,
      model: 'embed-english-light-v3.0',
      input_type: 'search_document',
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return response.data.embeddings;
};

// For querying — input_type must be 'search_query' not 'search_document'
const getQueryEmbedding = async (text) => {
  const response = await axios.post(
    'https://api.cohere.com/v1/embed',
    {
      texts: [text],
      model: 'embed-english-light-v3.0',
      input_type: 'search_query',
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return response.data.embeddings[0];
};

module.exports = { getEmbedding, getEmbeddings, getQueryEmbedding };