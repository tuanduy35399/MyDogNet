import { Link, Outlet } from "react-router-dom";

export default function Admin() {
  return (
    <section>
      <nav className="navbar navbar-expand-lg navbar-light bg-light gap-100">
        <div className="container-fluid">
          <Link to="/admin-dashboard-80820508" className="nav-link active">
            <img src="/dognet-favicon.png" style={{ width: "40px" }} />
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link to="account-manager-80820508" className="nav-link active">
                  Accounts
                </Link>
              </li>
              <li className="nav-item">
                <Link to="post-manager-80820508" className="nav-link active">
                  Posts
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/" className="nav-link active">
                  Guest
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <h1>Chào mừng Admin</h1>
      <Outlet /> {/*Hiển thị nội dung các route con*/}
    </section>
  );
}
