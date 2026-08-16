import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cvd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const guestToken = localStorage.getItem('cvd_guest_token');
  if (guestToken) config.headers['x-guest-token'] = guestToken;

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('cvd_token')) {
      // token expired/invalid -> clear and let the app redirect to login
      localStorage.removeItem('cvd_token');
      localStorage.removeItem('cvd_user');
    }
    return Promise.reject(err);
  }
);

export default api;
