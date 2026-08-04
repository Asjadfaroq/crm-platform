import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchLeads = createAsyncThunk('leads/fetchLeads', async (params, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/leads', { params });
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to fetch leads');
    }
});

export const fetchLeadStats = createAsyncThunk('leads/fetchStats', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/leads/stats');
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to fetch stats');
    }
});

export const fetchAnalytics = createAsyncThunk('leads/fetchAnalytics', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/leads/analytics');
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to fetch analytics');
    }
});

export const createLead = createAsyncThunk('leads/create', async (leadData, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/leads', leadData);
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to create lead');
    }
});

export const updateLead = createAsyncThunk('leads/update', async ({ id, ...updates }, { rejectWithValue }) => {
    try {
        const { data } = await api.put(`/leads/${id}`, updates);
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to update lead');
    }
});

export const deleteLead = createAsyncThunk('leads/delete', async (id, { rejectWithValue }) => {
    try {
        await api.delete(`/leads/${id}`);
        return id;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to delete lead');
    }
});

export const assignLead = createAsyncThunk('leads/assign', async ({ id, assignedTo }, { rejectWithValue }) => {
    try {
        const { data } = await api.put(`/leads/${id}/assign`, { assignedTo });
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to assign lead');
    }
});

export const addNote = createAsyncThunk('leads/addNote', async ({ id, text }, { rejectWithValue }) => {
    try {
        const { data } = await api.post(`/leads/${id}/notes`, { text });
        return data;
    } catch (err) {
        return rejectWithValue(err.response?.data?.message || 'Failed to add note');
    }
});

const leadSlice = createSlice({
    name: 'leads',
    initialState: {
        items: [],
        stats: { total: 0, newLeads: 0, highPriority: 0, closed: 0 },
        analytics: null,
        analyticsLoading: false,
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        loading: false,
        error: null,
        filters: { status: '', priority: '', search: '', assignedTo: '' },
    },
    reducers: {
        setFilters(state, action) {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters(state) {
            state.filters = { status: '', priority: '', search: '', assignedTo: '' };
        },
        // ── WebSocket real-time reducers ──────────────────────────────────
        socketLeadCreated(state, action) {
            const lead = action.payload;
            if (state.items.find((l) => l._id === lead._id)) return; // deduplicate
            state.total += 1;
            state.totalPages = Math.ceil(state.total / state.limit);
            // Only inject into the visible list when viewing page 1 (first page);
            // on deeper pages the new lead belongs on page 1, not the current view.
            if (state.page === 1) {
                state.items.unshift(lead);
                // Trim to page size so we don't exceed `limit` rows
                if (state.items.length > state.limit) state.items.pop();
            }
        },
        socketLeadUpdated(state, action) {
            const lead = action.payload;
            const idx = state.items.findIndex((l) => l._id === lead._id);
            if (idx !== -1) state.items[idx] = lead;
        },
        socketLeadDeleted(state, action) {
            const { id } = action.payload;
            const exists = state.items.some((l) => l._id === id);
            if (exists) {
                state.items = state.items.filter((l) => l._id !== id);
                state.total = Math.max(0, state.total - 1);
                state.totalPages = Math.max(1, Math.ceil(state.total / state.limit));
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchLeads.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchLeads.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.leads;
                state.total = action.payload.total;
                state.page = action.payload.page;
                state.totalPages = action.payload.totalPages;
                // Sync limit from what was actually requested
                if (action.meta.arg?.limit) state.limit = action.meta.arg.limit;
            })
            .addCase(fetchLeads.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(fetchLeadStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            })
            .addCase(fetchAnalytics.pending, (state) => { state.analyticsLoading = true; })
            .addCase(fetchAnalytics.fulfilled, (state, action) => {
                state.analyticsLoading = false;
                state.analytics = action.payload;
            })
            .addCase(fetchAnalytics.rejected, (state) => { state.analyticsLoading = false; })
            .addCase(createLead.fulfilled, (state, action) => {
                // Guard: socket may have already inserted this lead before the HTTP
                // response arrived (race condition). Skip if it's already present.
                if (state.items.find((l) => l._id === action.payload._id)) return;
                state.items.unshift(action.payload);
                state.total += 1;
            })
            .addCase(updateLead.fulfilled, (state, action) => {
                const idx = state.items.findIndex((l) => l._id === action.payload._id);
                if (idx !== -1) state.items[idx] = action.payload;
            })
            .addCase(deleteLead.fulfilled, (state, action) => {
                state.items = state.items.filter((l) => l._id !== action.payload);
                state.total -= 1;
            })
            .addCase(assignLead.fulfilled, (state, action) => {
                const idx = state.items.findIndex((l) => l._id === action.payload._id);
                if (idx !== -1) state.items[idx] = action.payload;
            })
            .addCase(addNote.fulfilled, (state, action) => {
                const idx = state.items.findIndex((l) => l._id === action.payload._id);
                if (idx !== -1) state.items[idx] = action.payload;
            });
    },
});

export const {
    setFilters,
    clearFilters,
    socketLeadCreated,
    socketLeadUpdated,
    socketLeadDeleted,
} = leadSlice.actions;
export default leadSlice.reducer;
