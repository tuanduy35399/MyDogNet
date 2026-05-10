import { useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header/Header";
import ListPost from "../../components/ListPost/ListPost";
import { useUser } from "../../context/UserContext";

function Home() {
  const { user } = useUser();
  const [isListLoading, setIsListLoading] = useState(true);

  const isLoading = isListLoading || !user;

  return (
    <section>
      {isLoading ? (
        /* Màn hình loading toàn trang */
        <div
          className="d-flex justify-content-center align-items-center gap-2"
          style={{ height: "100vh" }}
        >
          <div className="spinner-grow text-primary" role="status"></div>
          <div className="spinner-grow text-primary" role="status"></div>
          <div className="spinner-grow text-primary" role="status"></div>
        </div>
      ) : null}

      {/* Vẫn render nhưng ẩn đi cho đến khi load xong để tránh giật trang */}
      <div style={{ display: isLoading ? "none" : "block" }}>
        <Header bgURL={user?.backGroundImg} />
        <ListPost onDataLoaded={() => setIsListLoading(false)} />
        <Footer />
      </div>
    </section>
  );
}

export default Home;
