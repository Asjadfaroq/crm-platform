import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd());
    // Use VITE_WS_URL as the proxy target so both point to the same backend
    const backendTarget = env.VITE_WS_URL || 'http://localhost:5003';

    return {
        plugins: [react()],
        server: {
            host: '0.0.0.0',
            port: 5173,
            strictPort: true,
            proxy: {
                '/api': {
                    target: backendTarget,
                    changeOrigin: true,
                },
                '/socket.io': {
                    target: backendTarget,
                    changeOrigin: true,
                    ws: true,
                },
            },
        },
    };
});