import { Link } from "react-router-dom";
import axiosClient from "../../api";
import { useEffect, useState } from "react";

export default function ListPost({ onDataLoaded }) {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 5; // Số lượng bài mỗi trang

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFind = () => {
    setPage(1); // Reset về trang 1 khi tìm kiếm mới
    setSearchTerm(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchTerm("");
    setPage(1);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    let isMounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      setIsFetching(true);
      try {
        // Gửi tham số bằng params của Axios để tự động mã hóa an toàn các ký tự đặc biệt (&, +, ?, tiếng Việt)
        const res = await axiosClient.get("/post", {
          params: {
            pageNumber: page,
            pageSize: pageSize,
            searchTerm: searchTerm || undefined,
          },
          signal: controller.signal,
        });

        if (isMounted) {
          const list = res.data?.data || [];
          setPosts(list);
          setTotalPages(res.data?.totalPages || 1);
          setTotalRecords(res.data?.totalRecords || 0);
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }
        console.error("Fetch error:", err);
      } finally {
        if (isMounted) {
          setIsFetching(false);
          if (onDataLoaded) {
            onDataLoaded();
          }
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [page, searchTerm]);

  return (
    <>
      {/* Thanh tìm kiếm bài viết */}
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="input-group shadow-sm">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm bài viết theo tiêu đề..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFind()}
                aria-label="Tìm kiếm bài viết"
                data-testid="search-input"
              />
              <button
                className="btn btn-primary px-3"
                type="button"
                onClick={handleFind}
                data-testid="search-button"
              >
                <i className="bi bi-search me-1"></i> Tìm
              </button>
              {(searchTerm || searchInput) && (
                <button
                  className="btn btn-outline-secondary px-3"
                  type="button"
                  onClick={handleClear}
                  title="Xóa bộ lọc tìm kiếm"
                  data-testid="clear-search-button"
                >
                  <i className="bi bi-x-lg me-1"></i> Xóa lọc
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="text-muted small mt-2 d-flex justify-content-between align-items-center">
                <span>
                  Kết quả cho: <strong>"{searchTerm}"</strong>
                </span>
                <span className="badge bg-light text-dark border">
                  {totalRecords} bài viết
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trạng thái không có kết quả */}
      {!isFetching && posts.length === 0 && (
        <div
          className="container text-center py-5 my-4"
          data-testid="empty-posts-message"
        >
          <div className="text-muted mb-3">
            <i className="bi bi-journal-x display-4 text-secondary"></i>
          </div>
          <h4 className="fw-bold text-secondary">Không tìm thấy bài viết nào</h4>
          <p className="text-muted">
            {searchTerm
              ? `Không có bài viết nào khớp với từ khóa "${searchTerm}".`
              : "Hiện tại chưa có bài viết nào được đăng tải."}
          </p>
          {searchTerm && (
            <button className="btn btn-outline-primary mt-2" onClick={handleClear}>
              Xem tất cả bài viết
            </button>
          )}
        </div>
      )}

      {/* Danh sách bài viết */}
      {posts.map((item) => (
        <div
          className="container d-flex justify-content-center mt-5"
          key={item?.id}
          data-testid={`post-card-${item?.id}`}
        >
          <div className="card shadow-sm" style={{ width: "50rem", overflow: "hidden" }}>
            {item?.thumbnail && (
              <img
                className="card-img-top"
                src={item?.thumbnail}
                alt={item?.title}
                style={{ height: "250px", objectFit: "cover" }}
              />
            )}
            <div className="card-body text-start p-4">
              <h3 className="card-title fw-bold mb-2">{item?.title}</h3>
              <p className="card-text mb-1 text-secondary">
                <strong>Author:</strong> {item?.authorName}
              </p>
              <p className="card-text mb-3">
                <small className="text-muted">
                  <i className="bi bi-clock me-1"></i>
                  {formatDate(item?.createdAt)}
                </small>
              </p>
              <Link to={`/post/${item?.id}`} className="btn btn-primary px-3">
                READ MORE <i className="bi bi-arrow-right ms-1"></i>
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Thanh điều hướng phân trang */}
      {totalPages > 1 && (
        <nav
          className="mt-5 d-flex flex-column align-items-center"
          aria-label="Điều hướng trang"
          data-testid="pagination-nav"
        >
          <ul className="pagination shadow-sm">
            <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                data-testid="prev-page-button"
              >
                &laquo; Trước
              </button>
            </li>

            {[...Array(totalPages)].map((_, i) => (
              <li
                key={i}
                className={`page-item ${page === i + 1 ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => setPage(i + 1)}
                  data-testid={`page-button-${i + 1}`}
                >
                  {i + 1}
                </button>
              </li>
            ))}

            <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                data-testid="next-page-button"
              >
                Sau &raquo;
              </button>
            </li>
          </ul>
          <div className="text-muted small mt-1">
            Trang {page} / {totalPages} (Tổng số: {totalRecords} bài)
          </div>
        </nav>
      )}
    </>
  );
}
