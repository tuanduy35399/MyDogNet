// import styles from "./Home.module.css";

import Footer from "../../components/Footer";
import Header from "../../components/Header/Header";
import ListPost from "../../components/ListPost/ListPost";

function Home() {

  return (
    <section>
      <Header
        bgURL={
          "https://res.cloudinary.com/db0315mif/image/upload/v1777184228/default_background_i13wjr.jpg"
        }
        avatarURL={
          "https://res.cloudinary.com/db0315mif/image/upload/v1777184226/default_avatar_tqisty.jpg"
        }
      />
      <ListPost />
      <Footer />
    </section>
  );
}

export default Home;
