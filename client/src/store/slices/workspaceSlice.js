import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

// Fetch all workspaces for the current user
export const fetchWorkspaces = createAsyncThunk(
    'workspace/fetchWorkspaces',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/workspaces');
            return data.workspaces;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to load workspaces');
        }
    }
);

// Create a new workspace
export const createWorkspace = createAsyncThunk(
    'workspace/createWorkspace',
    async (payload, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/workspaces', payload);
            return data.workspace;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to create workspace');
        }
    }
);

// Invite a member
export const inviteMember = createAsyncThunk(
    'workspace/inviteMember',
    async ({ workspaceId, email, role }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/workspaces/${workspaceId}/invite`, { email, role });
            return data.workspace;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to invite member');
        }
    }
);

// Update member role
export const updateMemberRole = createAsyncThunk(
    'workspace/updateMemberRole',
    async ({ workspaceId, userId, role }, { rejectWithValue }) => {
        try {
            await api.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
            return { userId, role };
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to update role');
        }
    }
);

// Remove member — reassignTo is a userId (number) or null/undefined (unassign)
export const removeMember = createAsyncThunk(
    'workspace/removeMember',
    async ({ workspaceId, userId, reassignTo }, { rejectWithValue }) => {
        try {
            await api.delete(`/workspaces/${workspaceId}/members/${userId}`, {
                data: reassignTo != null ? { reassignTo } : {},
            });
            return userId;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to remove member');
        }
    }
);

// Request ownership transfer — sends OTP to owner's email
export const requestOwnershipTransfer = createAsyncThunk(
    'workspace/requestOwnershipTransfer',
    async ({ workspaceId, targetUserId }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/workspaces/${workspaceId}/transfer-ownership/request`, { targetUserId });
            return data.message;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to send OTP');
        }
    }
);

// Confirm ownership transfer with OTP
export const confirmOwnershipTransfer = createAsyncThunk(
    'workspace/confirmOwnershipTransfer',
    async ({ workspaceId, otp }, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/workspaces/${workspaceId}/transfer-ownership/confirm`, { otp });
            return data.workspace;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to confirm transfer');
        }
    }
);

// Update API key / webhook URL
export const updateApiWebhook = createAsyncThunk(
    'workspace/updateApiWebhook',
    async ({ workspaceId, webhookUrl, regenerateApiKey }, { rejectWithValue }) => {
        try {
            const { data } = await api.patch(`/workspaces/${workspaceId}/settings`, {
                webhookUrl,
                regenerateApiKey,
            });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Failed to update settings');
        }
    }
);

// Retrieve stored workspace
const storedWorkspace = (() => {
    try {
        const raw = localStorage.getItem('workspace');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
})();

const workspaceSlice = createSlice({
    name: 'workspace',
    initialState: {
        currentWorkspace: storedWorkspace,
        workspaces: [],
        loading: false,
        error: null,
    },
    reducers: {
        setCurrentWorkspace(state, action) {
            state.currentWorkspace = action.payload;
            localStorage.setItem('workspace', JSON.stringify(action.payload));
        },
        clearWorkspace(state) {
            state.currentWorkspace = null;
            state.workspaces = [];
            localStorage.removeItem('workspace');
        },
        clearWorkspaceError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // fetchWorkspaces
            .addCase(fetchWorkspaces.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(fetchWorkspaces.fulfilled, (state, action) => {
                state.loading = false;
                state.workspaces = action.payload;
                // Auto-select if only one workspace and none selected
                if (!state.currentWorkspace && action.payload.length === 1) {
                    state.currentWorkspace = action.payload[0];
                    localStorage.setItem('workspace', JSON.stringify(action.payload[0]));
                } else if (state.currentWorkspace) {
                    // Always sync currentWorkspace with fresh server data
                    const fresh = action.payload.find((w) => w._id === state.currentWorkspace._id);
                    if (fresh) {
                        state.currentWorkspace = fresh;
                        localStorage.setItem('workspace', JSON.stringify(fresh));
                    }
                }
            })
            .addCase(fetchWorkspaces.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // createWorkspace
            .addCase(createWorkspace.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(createWorkspace.fulfilled, (state, action) => {
                state.loading = false;
                const ws = action.payload;
                state.workspaces.unshift(ws);
                state.currentWorkspace = ws;
                localStorage.setItem('workspace', JSON.stringify(ws));
            })
            .addCase(createWorkspace.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // inviteMember
            .addCase(inviteMember.pending, (state) => { state.error = null; })
            .addCase(inviteMember.fulfilled, (state, action) => {
                const updated = action.payload;
                // Update in workspaces list
                const idx = state.workspaces.findIndex((w) => w._id === updated._id);
                if (idx !== -1) state.workspaces[idx] = updated;
                // Update currentWorkspace if it matches
                if (state.currentWorkspace?._id === updated._id) {
                    state.currentWorkspace = updated;
                    localStorage.setItem('workspace', JSON.stringify(updated));
                }
            })
            .addCase(inviteMember.rejected, (state, action) => { state.error = action.payload; })
            // updateMemberRole
            .addCase(updateMemberRole.fulfilled, (state, action) => {
                const { userId, role } = action.payload;
                if (state.currentWorkspace?.members) {
                    const member = state.currentWorkspace.members.find(
                        (m) => m.user._id === userId || m.user === userId
                    );
                    if (member) member.role = role;
                    localStorage.setItem('workspace', JSON.stringify(state.currentWorkspace));
                }
            })
            // removeMember
            .addCase(removeMember.fulfilled, (state, action) => {
                const userId = action.payload;
                if (state.currentWorkspace?.members) {
                    state.currentWorkspace.members = state.currentWorkspace.members.filter(
                        (m) => (m.user._id || m.user) !== userId
                    );
                    localStorage.setItem('workspace', JSON.stringify(state.currentWorkspace));
                }
            })
            // confirmOwnershipTransfer
            .addCase(confirmOwnershipTransfer.fulfilled, (state, action) => {
                const updated = action.payload;
                if (!updated) return;
                const idx = state.workspaces.findIndex((w) => w._id === updated._id);
                if (idx !== -1) state.workspaces[idx] = updated;
                if (state.currentWorkspace?._id === updated._id) {
                    state.currentWorkspace = updated;
                    localStorage.setItem('workspace', JSON.stringify(updated));
                }
            })
            // updateApiWebhook
            .addCase(updateApiWebhook.fulfilled, (state, action) => {
                if (state.currentWorkspace) {
                    state.currentWorkspace.apiKey = action.payload.apiKey;
                    state.currentWorkspace.webhookUrl = action.payload.webhookUrl;
                    localStorage.setItem('workspace', JSON.stringify(state.currentWorkspace));
                }
            });
    },
});

export const { setCurrentWorkspace, clearWorkspace, clearWorkspaceError } = workspaceSlice.actions;
export default workspaceSlice.reducer;
