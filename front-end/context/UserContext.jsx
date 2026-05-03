import axios from "axios";
import { createContext, useState, useContext, useEffect } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://dognet.runasp.net/AboutMe");
        setUser(res.data[0]);
        console.log(res);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);
  // const updateAvatar = (newUrl) => {
  //   setUser((prev) => ({ ...prev, avatar: newUrl, }));
  // };
  return (
    <UserContext.Provider value={{ user }}>{children}</UserContext.Provider>
  );
};
export const useUser = () => useContext(UserContext);
