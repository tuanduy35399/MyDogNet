import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function SignIn() {
  // 1. Quản lý dữ liệu người dùng nhập vào
  const [username, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Ngăn trang web load lại
    setError("");

    try {
      // 2. Gọi API đăng nhập (Thay URL bằng API thật của bạn)
      const res = await axios.post(
        "http://dognet.runasp.net/account/signin",
        {
          userName: username,
          password: password,
        },
      );

      // 3. Lưu Token vào localStorage (Đặt tên là "tk" như bạn muốn)
      localStorage.setItem("tk", res.data);

      // 4. Đăng nhập xong thì phi thẳng vào Admin Dashboard
      navigate("/admin-dashboard-80820508");
    } catch (err) {
      setError("Email hoặc mật khẩu không chính xác!");
      console.error(err);
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

          <button type="submit" className="btn btn-primary w-100 mt-4">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
