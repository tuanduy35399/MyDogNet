import { Link } from "react-router-dom";
import axiosClient from "../../api";
import { useEffect, useState } from "react";

export default function ListPost({ onDataLoaded }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 5; // Số lượng bài mỗi trang
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Gửi tham số phân trang lên server
        const res = await axiosClient.get(
          `/post?pageNumber=${page}&pageSize=${pageSize}`,
        );

        if (isMounted) {
          // res.data.data là mảng bài viết, res.data.totalPages là tổng số trang
          setPosts(res.data.data || []);
          setTotalPages(res.data.totalPages || 1);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (isMounted) {
          onDataLoaded();
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [page]); // useEffect sẽ chạy lại mỗi khi 'page' thay đổi

  return (
    <>
      {/* Danh sách bài viết */}
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
                  {formatDate(item?.createdAt)}
                </small>
              </p>
              <Link to={`/post/${item?.id}`} className="btn btn-primary">
                READ MORE
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Chỗ này là cái thanh điều hướng phân trang lấy từ Bootstrap */}
      <nav className="mt-5 d-flex justify-content-center">
        <ul className="pagination">
          <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage(page - 1)}>
              Previous
            </button>
          </li>

          {[...Array(totalPages)].map((_, i) => (
            <li
              key={i}
              className={`page-item ${page === i + 1 ? "active" : ""}`}
            >
              <button className="page-link" onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            </li>
          ))}

          <li className={`page-item ${page === totalPages ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage(page + 1)}>
              Next
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
