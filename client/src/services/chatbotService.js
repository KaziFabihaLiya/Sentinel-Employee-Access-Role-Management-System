import axiosInstance from '../api/axiosInstance';

export const sendChatbotMessage = async (message) => {
  const res = await axiosInstance.post('/chatbot/message', { message });
  return res.data;
};
