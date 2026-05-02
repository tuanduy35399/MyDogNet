import styles from "./Home.module.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Header from "../../components/Header/Header";
import ListPost from "../../components/ListPost/ListPost";

function Home() {
  return (
    <section>
      <header>
        <Header />
      </header>
      <ListPost />
      <footer>Footer</footer>
    </section>
  );
}

export default Home;
