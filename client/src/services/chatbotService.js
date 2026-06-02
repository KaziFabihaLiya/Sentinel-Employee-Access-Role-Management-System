import axiosInstance from '../api/axiosInstance';

export const sendChatbotMessage = async (message) => {
  const res = await axiosInstance.post('/chatbot/ask', { prompt: message });
  return res.data;
};
