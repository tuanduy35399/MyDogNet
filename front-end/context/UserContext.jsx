import { createContext, useState, useContext, useEffect } from "react";
import axiosClient from "../api";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosClient.get("/AboutMe");
        setUser(res.data?.[0] || null);
      } catch (error) {
        console.error("Lỗi khi tải thông tin người dùng (AboutMe):", error);
        setUserError(error);
      } finally {
        setIsUserLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <UserContext.Provider value={{ user, isUserLoading, userError }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
