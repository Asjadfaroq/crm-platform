import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import leadReducer from './slices/leadSlice';
import logReducer from './slices/logSlice';
import userReducer from './slices/userSlice';
import workspaceReducer from './slices/workspaceSlice';
import deletedLeadReducer from './slices/deletedLeadSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        leads: leadReducer,
        logs: logReducer,
        users: userReducer,
        workspace: workspaceReducer,
        deletedLeads: deletedLeadReducer,
    },
});

export default store;

