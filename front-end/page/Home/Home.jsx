// import styles from "./Home.module.css";

import Footer from "../../components/Footer";
import Header from "../../components/Header/Header";
import ListPost from "../../components/ListPost/ListPost";
import { useUser } from "../../context/UserContext";

function Home() {
  const { user } = useUser();// lấy dữ liệu từ kho chung (context) 
  return (
    <section>
      <Header bgURL={user?.backGroundImg}/>
      <ListPost />
      <Footer />
    </section>
  );
}

export default Home;
