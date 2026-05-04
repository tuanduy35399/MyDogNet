import Home from "../page/Home/Home";
import About from "../page/About/About";
import Search from "../page/Search/Search";
import Admin from "../page/Admin/main/Admin";
import NotFound from "../page/NotFound";
import { UserProvider } from "../context/UserContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import PostDetail from "../page/PostDetail/PostDetail";
import SignIn from "../page/Admin/SignIn";
import SignUp from "../page/Admin/SignUp";
import ProtectedRoute from "../components/ReactRouter";
function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<NotFound />} />
          //dấu * là trang sẽ trả về cho bất kì đường dẫn nào không được định
          nghĩa
          <Route path="/post/:id" element={<PostDetail />} />
          //trang dang nhap dang ky cho admin
          <Route path="/admin-signup-80820508" element={<SignUp />} />
          <Route path="/admin-signin-80820508" element={<SignIn />} />
          //trang cho Admin được bảo vệ
          <Route
            path="/admin-dashboard-80820508"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
