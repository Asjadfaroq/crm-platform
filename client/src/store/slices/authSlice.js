import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';
import { setCurrentWorkspace } from './workspaceSlice';

// Step 1 of login: validate credentials → server sends OTP to email
export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/auth/login', credentials);
        // data = { otpSent: true, email }
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
});

// Step 1 of signup: create account → server sends OTP to email
export const signup = createAsyncThunk('auth/signup', async (userData, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/auth/signup', userData);
        // data = { otpSent: true, email }
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
});

// Step 2 of login/signup: verify OTP → receive access + refresh tokens
export const verifyOtp = createAsyncThunk('auth/verifyOtp', async ({ email, otp, purpose }, { rejectWithValue, dispatch }) => {
    try {
        const { data } = await api.post('/auth/verify-otp', { email, otp, purpose });
        // Store access token (1h) and refresh token (1d)
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.workspaces?.length > 0) {
            try {
                const wsRes = await api.get(`/workspaces/${data.workspaces[0].id}`);
                dispatch(setCurrentWorkspace(wsRes.data.workspace));
            } catch {
                dispatch(setCurrentWorkspace(data.workspaces[0]));
            }
        }
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'OTP verification failed');
    }
});

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async ({ email }, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/auth/forgot-password', { email });
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to send reset email');
    }
});

export const resetPassword = createAsyncThunk('auth/resetPassword', async ({ token, password }, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/auth/reset-password', { token, password });
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Password reset failed');
    }
});

// Resend OTP to the pending email
export const resendOtp = createAsyncThunk('auth/resendOtp', async ({ email, purpose }, { rejectWithValue }) => {
    try {
        await api.post('/auth/resend-otp', { email, purpose });
        return { email };
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to resend OTP');
    }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async ({ name }, { rejectWithValue }) => {
    try {
        const { data } = await api.patch('/auth/profile', { name });
        localStorage.setItem('user', JSON.stringify(data.user));
        return data.user;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to update profile');
    }
});

export const changePassword = createAsyncThunk('auth/changePassword', async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
        const { data } = await api.patch('/auth/change-password', { currentPassword, newPassword });
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to change password');
    }
});

export const getMe = createAsyncThunk('auth/getMe', async (_, { rejectWithValue, dispatch }) => {
    try {
        const { data } = await api.get('/auth/me');
        if (data.workspaces?.length > 0) {
            const storedWs = localStorage.getItem('workspace');
            if (!storedWs) {
                try {
                    const wsRes = await api.get(`/workspaces/${data.workspaces[0].id}`);
                    dispatch(setCurrentWorkspace(wsRes.data.workspace));
                } catch {
                    dispatch(setCurrentWorkspace(data.workspaces[0]));
                }
            }
        }
        return data.user;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Auth check failed');
    }
});

const storedUser = localStorage.getItem('user');

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: storedUser ? JSON.parse(storedUser) : null,
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null,
        // OTP flow state
        pendingEmail: null,
        otpPurpose: null,
        otpLoading: false,
        otpError: null,
        resendLoading: false,
        // Forgot/reset password state
        forgotLoading: false,
        forgotError: null,
        forgotSuccess: false,
        resetLoading: false,
        resetError: null,
        resetSuccess: false,
    },
    reducers: {
        logout(state) {
            state.user = null;
            state.token = null;
            state.pendingEmail = null;
            state.otpPurpose = null;
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        },
        clearError(state) {
            state.error = null;
        },
        clearOtpError(state) {
            state.otpError = null;
        },
        clearPending(state) {
            state.pendingEmail = null;
            state.otpPurpose = null;
        },
        clearForgot(state) {
            state.forgotLoading = false;
            state.forgotError = null;
            state.forgotSuccess = false;
        },
        clearReset(state) {
            state.resetLoading = false;
            state.resetError = null;
            state.resetSuccess = false;
        },
    },
    extraReducers: (builder) => {
        builder
            // ── Login (step 1) ────────────────────────────────────────────────
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingEmail = action.payload.email;
                state.otpPurpose = 'login';
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = typeof action.payload === 'string' ? action.payload : 'Login failed';
            })

            // ── Signup (step 1) ───────────────────────────────────────────────
            .addCase(signup.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(signup.fulfilled, (state, action) => {
                state.loading = false;
                state.pendingEmail = action.payload.email;
                state.otpPurpose = 'signup';
            })
            .addCase(signup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // ── Verify OTP (step 2) ───────────────────────────────────────────
            .addCase(verifyOtp.pending, (state) => {
                state.otpLoading = true;
                state.otpError = null;
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.otpLoading = false;
                state.user = action.payload.user;
                state.token = action.payload.accessToken;
                state.pendingEmail = null;
                state.otpPurpose = null;
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.otpLoading = false;
                state.otpError = action.payload;
            })

            // ── Resend OTP ────────────────────────────────────────────────────
            .addCase(resendOtp.pending, (state) => {
                state.resendLoading = true;
            })
            .addCase(resendOtp.fulfilled, (state) => {
                state.resendLoading = false;
            })
            .addCase(resendOtp.rejected, (state) => {
                state.resendLoading = false;
            })

            // ── Forgot password ───────────────────────────────────────────────
            .addCase(forgotPassword.pending, (state) => {
                state.forgotLoading = true;
                state.forgotError = null;
                state.forgotSuccess = false;
            })
            .addCase(forgotPassword.fulfilled, (state) => {
                state.forgotLoading = false;
                state.forgotSuccess = true;
            })
            .addCase(forgotPassword.rejected, (state, action) => {
                state.forgotLoading = false;
                state.forgotError = action.payload;
            })

            // ── Reset password ────────────────────────────────────────────────
            .addCase(resetPassword.pending, (state) => {
                state.resetLoading = true;
                state.resetError = null;
                state.resetSuccess = false;
            })
            .addCase(resetPassword.fulfilled, (state) => {
                state.resetLoading = false;
                state.resetSuccess = true;
            })
            .addCase(resetPassword.rejected, (state, action) => {
                state.resetLoading = false;
                state.resetError = action.payload;
            })

            // ── getMe ─────────────────────────────────────────────────────────
            .addCase(getMe.fulfilled, (state, action) => { state.user = action.payload; })
            .addCase(getMe.rejected, (state) => {
                state.user = null;
                state.token = null;
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            })

            // ── updateProfile ─────────────────────────────────────────────────
            .addCase(updateProfile.fulfilled, (state, action) => { state.user = action.payload; })

            // ── changePassword — no state changes needed ──────────────────────
            .addCase(changePassword.rejected, () => {});
    },
});

export const { logout, clearError, clearOtpError, clearPending, clearForgot, clearReset } = authSlice.actions;
export default authSlice.reducer;
