import styles from "./Home.module.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Header from "../../components/Header/Header";

function Home() {
  return (
    <section>
      <header>
        <Header />
      </header>

      <footer>Footer</footer>
    </section>
  );
}

export default Home;
