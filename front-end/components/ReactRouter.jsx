import NotFound from "../page/NotFound";

export default function ProtectedRoute({ children, userRole, requireRole }) {
    const hasPermission = userRole === requireRole
    if (!hasPermission) {
        return <NotFound/>
    }
    return children;
}