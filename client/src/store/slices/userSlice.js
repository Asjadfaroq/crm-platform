import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchUsers = createAsyncThunk('users/fetchAll', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/users');
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
    }
});

export const registerUser = createAsyncThunk('users/register', async (userData, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/auth/register', userData);
        return data.user;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to register user');
    }
});

export const changeUserRole = createAsyncThunk('users/changeRole', async ({ id, role }, { rejectWithValue }) => {
    try {
        const { data } = await api.patch(`/users/${id}/role`, { role });
        return { id, role };
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to change role');
    }
});

export const toggleUserActive = createAsyncThunk('users/toggleActive', async (id, { rejectWithValue }) => {
    try {
        const { data } = await api.patch(`/users/${id}/toggle`);
        return data.user;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to toggle user');
    }
});

const userSlice = createSlice({
    name: 'users',
    initialState: {
        items: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => { state.loading = true; })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.items.push(action.payload);
            })
            .addCase(changeUserRole.fulfilled, (state, action) => {
                const { id, role } = action.payload;
                const idx = state.items.findIndex((u) => u._id === id);
                if (idx !== -1) state.items[idx] = { ...state.items[idx], role };
            })
            .addCase(toggleUserActive.fulfilled, (state, action) => {
                const idx = state.items.findIndex((u) => u._id === action.payload?._id);
                if (idx !== -1) state.items[idx] = { ...state.items[idx], isActive: action.payload.isActive };
            });
    },
});

export default userSlice.reducer;
