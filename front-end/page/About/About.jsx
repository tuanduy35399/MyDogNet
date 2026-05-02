import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import styles from "./About.module.css"; 
import axios from "axios";
function About() {
    
    const [user, setUser] = useState(null);

    const fetchData = async () => {
        try {
            const res = await axios.get("https://localhost:7085/AboutMe")
            setUser(res.data[0]);
            console.log(res)
        } catch (error) {
            console.error(error);
        }
    }
    useEffect(() => {
        fetchData();
    }, []) 
    
  return (
    <section>
      <header>
        <Header />
      </header>
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
      <footer>Footer</footer>
    </section>
  );
}
export default About;
