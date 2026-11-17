import { jwtDecode } from "jwt-decode";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, adminOnly = false }) {
    const token = localStorage.getItem("tk")
    if (!token) {
      return <Navigate to="/admin-signin-80820508"  />;
    }
    try {
        const decoded = jwtDecode(token);
        //kiểm tra thời hạn token trước
        const isExpired = decoded.exp < Date.now() / 1000;
        if (isExpired) {
            alert("Token đã hết hạn!");
            localStorage.removeItem("tk"); // Xóa token cũ trên local
            return <Navigate to="/admin-signin-80820508"  />;
        }
        const claims = decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || [];
        const roles = Array.isArray(claims) ? claims : [claims];
        const isAdmin = roles.includes('Admin') || (!adminOnly && roles.includes('Editor'));
        if (!isAdmin) {
            return <Navigate to="/admin-signin-80820508" />;
        }
        //nếu oke hết thì trả về trang admin
        return children;
        
    } catch (error) {
        localStorage.removeItem("tk"); 
        return <Navigate to="/admin-signin-80820508" />;
    }
}