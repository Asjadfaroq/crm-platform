import axios from 'axios';

// In dev VITE_API_URL is empty → relative /api (proxied by Vite).
// In production set VITE_API_URL to the backend origin (e.g. https://api.example.com).
const BASE = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';

const api = axios.create({
    baseURL: BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach access token and active workspace to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    try {
        const workspace = localStorage.getItem('workspace');
        if (workspace) {
            const parsed = JSON.parse(workspace);
            if (parsed?._id) {
                config.headers['x-workspace-id'] = parsed._id;
            }
        }
    } catch {
        // ignore bad JSON in localStorage
    }
    return config;
});

const forceLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('workspace');
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
};

// On 401: try to refresh the access token once, then retry the original request.
// If refresh also fails, force logout.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh on 401, once, and not for auth endpoints themselves
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh') &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/verify-otp')
        ) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                try {
                    // Use plain axios to avoid the interceptor loop
                    const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
                    localStorage.setItem('token', data.accessToken);
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                    return api(originalRequest);
                } catch {
                    forceLogout();
                    return Promise.reject(error);
                }
            }

            forceLogout();
        }

        return Promise.reject(error);
    }
);

export default api;
