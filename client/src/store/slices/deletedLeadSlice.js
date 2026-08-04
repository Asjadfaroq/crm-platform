import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchDeletedLeads = createAsyncThunk(
    'deletedLeads/fetch',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/leads/deleted');
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to fetch deleted leads');
        }
    }
);

export const restoreDeletedLead = createAsyncThunk(
    'deletedLeads/restore',
    async (deletedId, { rejectWithValue }) => {
        try {
            await api.post(`/leads/${deletedId}/restore`);
            return deletedId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to restore lead');
        }
    }
);

const deletedLeadSlice = createSlice({
    name: 'deletedLeads',
    initialState: { items: [], loading: false, error: null },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDeletedLeads.pending,   (s) => { s.loading = true;  s.error = null; })
            .addCase(fetchDeletedLeads.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
            .addCase(fetchDeletedLeads.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
            .addCase(restoreDeletedLead.fulfilled, (s, a) => {
                s.items = s.items.filter((l) => l._id !== a.payload && l.id !== a.payload);
            });
    },
});

export default deletedLeadSlice.reducer;
