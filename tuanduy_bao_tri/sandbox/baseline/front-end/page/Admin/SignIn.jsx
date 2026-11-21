import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api";

export default function SignIn() {
  // 1. Quản lý dữ liệu người dùng nhập vào
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [isLoging, setLoging] = useState(false)
  const handleLogin = async (e) => {
    e.preventDefault(); // Ngăn trang web load lại
    setError("");
    setLoging(true)
    try {
      // 2. Gọi API đăng nhập (Thay URL bằng API thật của bạn)
      const res = await axiosClient.post(
        "/account/signin",
        {
          userName: username,
          password: password,
        },
      );

      // 3. Lưu Token vào localStorage (Đặt tên là "tk" như bạn muốn)
      localStorage.setItem("tk", res.data);
      setLoging(false)
      // 4. Đăng nhập xong thì phi thẳng vào Admin Dashboard
      navigate("/admin-dashboard-80820508");
    } catch (err) {
      setError("Email hoặc mật khẩu không chính xác!");
      console.error(err);
      setLoging(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow" style={{ width: "24rem" }}>
        <h2 className="text-center mb-4">Admin Login</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="text-start">
            <label htmlFor="exampleInputEmail1" className="form-label">
              User Name
            </label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUserName(e.target.value)} // Cập nhật state khi gõ
              required
            />
          </div>

          <div className="text-start mt-2">
            <label htmlFor="exampleInputPassword1" className="form-label">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Cập nhật state khi gõ
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 mt-4 "
            disabled={isLoging}
          >
            {isLoging ? (
              <div className="d-flex justify-content-center align-items-center gap-2">
                <div className="spinner-border" role="status"></div>
                <span className="sr-only">Loading...</span>
              </div>
            ) : (
              <>Login</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
