import { io } from 'socket.io-client';

// Dynamically use the current host so it works on both localhost and LAN/network access.
// Falls back to VITE_WS_URL env var if set, otherwise uses current window origin.
const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol}//${window.location.host}`;

let socket = null;

/**
 * Returns the singleton Socket.IO client instance.
 * Creates it on first call with the current JWT token.
 */
export const getSocket = () => {
    if (!socket) {
        const token = localStorage.getItem('token');
        socket = io(WS_URL, {
            auth: { token },
            autoConnect: false,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
    }
    return socket;
};

/**
 * Reconnects the socket with a fresh token (call after login / token refresh).
 */
export const reconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket.auth = { token: localStorage.getItem('token') };
        socket.connect();
    } else {
        getSocket().connect();
    }
};

/**
 * Disconnects and destroys the socket (call on logout).
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
