import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OtpPage from './pages/OtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import LogsPage from './pages/LogsPage';
import UsersPage from './pages/UsersPage';
import CreateWorkspacePage from './pages/CreateWorkspacePage';
import WorkspaceSettingsPage from './pages/WorkspaceSettingsPage';
import ApiWebhookPage from './pages/ApiWebhookPage';
import WorkspacesPage from './pages/WorkspacesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.88rem',
                    },
                }}
            />

            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/verify-otp" element={<OtpPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Workspace creation — requires auth but no workspace yet */}
                <Route
                    path="/workspace/create"
                    element={
                        <ProtectedRoute>
                            <CreateWorkspacePage />
                        </ProtectedRoute>
                    }
                />

                {/* Main app — requires auth + workspace */}
                <Route
                    element={
                        <ProtectedRoute requireWorkspace>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/workspaces" element={<WorkspacesPage />} />
                    <Route
                        path="/analytics"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <AnalyticsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <LogsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <UsersPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/workspace/settings"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <WorkspaceSettingsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/workspace/api-webhook"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <ApiWebhookPage />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
