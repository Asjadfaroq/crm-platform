import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, roles, requireWorkspace }) {
    const { user, token } = useSelector((state) => state.auth);
    const { currentWorkspace } = useSelector((state) => state.workspace);

    // Must be authenticated
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    // If workspace is required but user doesn't have one, send them to create one
    if (requireWorkspace && !currentWorkspace) {
        return <Navigate to="/workspace/create" replace />;
    }

    // Role check uses workspace-scoped membership
    if (roles && currentWorkspace) {
        const membership = currentWorkspace.members?.find(
            (m) => (m.user?._id || m.user) === user.id
        );
        const workspaceRole = membership?.role;
        if (!workspaceRole || !roles.includes(workspaceRole)) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
}
