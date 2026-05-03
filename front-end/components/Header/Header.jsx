import { Link } from "react-router-dom";
import styles from "./Header.module.css";
import { useUser } from "../../context/UserContext"; //dung context de duy tri Avatar
export default function Header({bgURL}) {//lay background linh hoat cho tung bai dang
  const { user } = useUser();// lấy dữ liệu từ kho chung (context) 
  return (
    <header>
      <div
        className={styles.background}
        style={{ backgroundImage: `url(${bgURL})` }}
      >
        <div className={styles["header-container"]}>
          <Link to="/about">
            <img src={user?.avatar} className={styles.avatar1} />
          </Link>
          <div className="dropdown">
            <button
              className="btn btn-secondary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              MENU
            </button>
            <ul className="dropdown-menu">
              <Link className="dropdown-item" to="/">
                <i className="bi bi-house"></i> Home
              </Link>
              <Link className="dropdown-item" to="/search">
                <i className="bi bi-search"></i> Search
              </Link>
              <Link className="dropdown-item" to="/about">
                <i className="bi bi-person-circle"></i> About
              </Link>
            </ul>
          </div>
        </div>
        <h1 className={styles.title}>My DogNet</h1>
      </div>
    </header>
  );
}
