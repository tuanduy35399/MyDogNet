import { jwtDecode } from "jwt-decode";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
    const token = localStorage.getItem("tk")
    if (!token) {
      return <Navigate to="/not-found"  />;
    }
    try {
        const decoded = jwtDecode(token);
        //kiểm tra thời hạn token trước
        const isExpired = decoded.exp < Date.now() / 1000;
        if (isExpired) {
            alert("Token đã hết hạn!");
            localStorage.removeItem("tk"); // Xóa token cũ trên local
            return <Navigate to="/not-found"  />;
        }
        const isAdmin = decoded["aud"] === "Admin";
        if (!isAdmin) {
            return <Navigate to="/not-found" />;
        }
        //nếu oke hết thì trả về trang admin
        return children;
        
    } catch (error) {
        localStorage.removeItem("tk"); 
        return <Navigate to="/not-found" />;
    }
}