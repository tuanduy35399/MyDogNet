import { UserProvider } from "../context/UserContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../page/Home/Home";
import About from "../page/About/About";
import NotFound from "../page/NotFound";
import PostDetail from "../page/PostDetail/PostDetail";

import Admin from "../page/Admin/main/Admin";
import CreatePost from "../page/Admin/manage/Post/CreatePost";
import UpdatePost from "../page/Admin/manage/Post/UpdatePost";
import AccountManager from "../page/Admin/manage/Account/AccountManager";
import PostManager from "../page/Admin/manage/Post/PostManager";
import SignIn from "../page/Admin/SignIn";
import SignUp from "../page/Admin/SignUp";
import ProtectedRoute from "../components/ReactRouter";
import UpdateAccount from "../page/Admin/manage/Account/UpdateAccount";
function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
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
          >
            //NestRoute- đường dẫn nội bộ sẽ không có dấu "/" phía trước
            <Route path="create-post-80820508" element={<CreatePost />} />
            <Route path="edit-post-80820508" element={<UpdatePost />} />
            <Route path="post-manager-80820508" element={<PostManager />} />
            <Route
              path="account-manager-80820508"
              element={<AccountManager />}
            />
            <Route
              path="edit-account-80820508/:id"
              element={<UpdateAccount />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
