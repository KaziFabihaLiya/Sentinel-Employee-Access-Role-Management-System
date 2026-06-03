const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getAssetUrl = (url) => {
  if (!url) return '';
  if (/^(data:|https?:\/\/)/i.test(url)) return url;

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return `${apiOrigin}${url.startsWith('/') ? url : `/${url}`}`;
};
