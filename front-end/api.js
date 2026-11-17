import axios from 'axios';

const axiosClient = axios.create({
  // Tự động lấy URL theo môi trường
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem('tk');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export default axiosClient;

