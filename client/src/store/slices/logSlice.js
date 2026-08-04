import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchLogs = createAsyncThunk('logs/fetchAll', async (params, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/logs', { params });
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to fetch logs');
    }
});

export const fetchLeadLogs = createAsyncThunk('logs/fetchByLead', async (leadId, { rejectWithValue }) => {
    try {
        const { data } = await api.get(`/logs/lead/${leadId}`);
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to fetch lead logs');
    }
});

const logSlice = createSlice({
    name: 'logs',
    initialState: {
        items: [],
        leadLogs: [],
        total: 0,
        page: 1,
        totalPages: 1,
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchLogs.pending, (state) => { state.loading = true; })
            .addCase(fetchLogs.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.logs;
                state.total = action.payload.total;
                state.page = action.payload.page;
                state.totalPages = action.payload.totalPages;
            })
            .addCase(fetchLogs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchLeadLogs.fulfilled, (state, action) => {
                state.leadLogs = action.payload.logs;
            });
    },
});

export default logSlice.reducer;
