import "./App.css";
import Home from "../page/Home/Home";
import About from "../page/About/About";
import Search from "../page/Search/Search";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "../page/NotFound";
import { UserProvider } from "../context/UserContext";
function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<NotFound />} /> //dấu * là trang sẽ trả về
          cho bất kì đường dẫn nào không được định nghĩa //trang cho Admin được
          bảo vệ
          {/* <Route path='/admin-dashboard'
          element={ 
            <ProtectedRoute 
          } /> */}
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}


export default App;
