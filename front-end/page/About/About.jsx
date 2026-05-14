
import Header from "../../components/Header/Header";
import styles from "./About.module.css";
import Footer from "../../components/Footer";
import { useUser } from "../../context/UserContext";
function About() {
  const { user } = useUser();
  const normalizeContent = (html) => {
    if (!html) return "";

    return html
      .replace(/&nbsp;/g, " ")
      .replace(/\u00A0/g, " ");
  };
  return (
    <section>
      <Header bgURL={user?.backGroundImg} />
      <div className={styles.contentArea}>
        <div className={styles.avatarWrapper}>
          <img src={user?.avatar} className={styles.avatar} alt="Avatar" />
        </div>
        <div className="container text-center text-black">
          <h1 className={styles.title}>{user?.userName}</h1>
            <div
            className={`mb-3 lh-lg mt-5 text-start ${styles["post-content"]}`}
            dangerouslySetInnerHTML={{
              __html: normalizeContent(user?.describe),
            }}
          ></div>
        </div>
      </div>
      <Footer />
    </section>
  );
}
export default About;
