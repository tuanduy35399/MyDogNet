
import Header from "../../components/Header/Header";
import styles from "./About.module.css";
import Footer from "../../components/Footer";
import { useUser } from "../../context/UserContext";
function About() {
  const { user } = useUser();
  return (
    <section>
      <Header bgURL={user?.backGroundImg} />
      <div className={styles.contentArea}>
        <div className={styles.avatarWrapper}>
          <img src={user?.avatar} className={styles.avatar} alt="Avatar" />
        </div>
        <div className="text-center mt-5 text-black">
          <h1 className={styles.title}>{user?.userName}</h1>
          <p className="text-secondary">{user?.describe}</p>
        </div>
      </div>
      <Footer />
    </section>
  );
}
export default About;
