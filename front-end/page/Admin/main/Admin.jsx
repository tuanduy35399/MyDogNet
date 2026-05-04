import { Link, useOutlet } from "react-router-dom";

export default function Admin() {
  const outlet = useOutlet();
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
      <div className="container mt-4">
        {outlet || (
          <div className="text-center">
            <h3 className="display-6">Chào mừng Admin!</h3>
            <img
              src="/dognet-logo.png"
              className="w-25 mt-5"
            />
          </div>
        )}
      </div>
    </section>
  );
}
