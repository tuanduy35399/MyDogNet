import { Link } from "react-router-dom";
import axiosClient from "../../api";
import { useEffect, useState } from "react";

export default function ListPost({ onDataLoaded }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await axiosClient.get("/post");
        if (isMounted) {
          const data = res.data || [];
          setPosts([...data].reverse());
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (isMounted) {
          // Báo cho Home biết là đã load xong (dù thành công hay lỗi)
          onDataLoaded();
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [onDataLoaded]);

  if (posts.length === 0) {
    return <div className="text-center mt-5">Không có bài viết nào</div>;
  }

  return (
    <>
      {posts.map((item) => (
        <div
          className="container d-flex justify-content-center mt-5"
          key={item?.id}
        >
          <div className="card" style={{ width: "50rem", overflow: "hidden" }}>
            <img
              className="card-img-top"
              src={item?.thumbnail}
              alt={item?.title}
              style={{ height: "250px", objectFit: "cover" }}
            />
            <div className="card-body text-start">
              <h3 className="card-title">{item?.title}</h3>
              <p className="card-text mb-1">
                <strong>Author:</strong> {item?.authorName}
              </p>
              <p className="card-text mb-1">
                <small className="text-muted">
                  Created at: {item?.createdAt}
                </small>
              </p>
              <Link to={`/post/${item?.id}`} className="btn btn-primary">
                READ MORE
              </Link>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
