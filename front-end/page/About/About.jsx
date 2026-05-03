import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import styles from "./About.module.css";
import axios from "axios";
import Footer from "../../components/Footer";
function About() {
  

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
      <div className={styles.contentArea}>
        <div className={styles.avatarWrapper}>
          <img
            src="https://res.cloudinary.com/db0315mif/image/upload/v1777184226/default_avatar_tqisty.jpg"
            className={styles.avatar}
            alt="Avatar"
          />
        </div>
        <div className="text-center mt-5 text-white">
          <h1 className={styles.title}>{user?.userName}</h1>
          <p className="text-secondary">{user?.describe}</p>
        </div>
      </div>
      <Footer />
    </section>
  );
}
export default About;
