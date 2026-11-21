import { useEffect, useState, useRef } from "react";
import axiosClient from "../../../../api";
import { Link } from "react-router-dom";

export default function PostManager() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1); // Mặc định trang 1
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 5; // Số lượng bài viết mỗi trang
  const [isLoading, setLoading] = useState(true);
  const [inputFind, setInputFind] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  // Lưu id bài viết được chọn để xóa
  const [selectedPostId, setSelectedPostId] = useState(null);

  // Xử lý tìm kiếm bài viết
  const handleFind = () => {
    setPage(1); // Set về trang 1 mỗi khi tìm kiếm
    setSearchTerm(inputFind.trim());
  };

  const handleClearFind = () => {
    setInputFind("");
    setSearchTerm("");
    setPage(1);
  };

  // Ref sử dụng để đóng/mở dialog
  const dialogRef = useRef(null);

  // Hàm xử lý đóng/mở dialog
  const openDeleteDialog = (id) => {
    setSelectedPostId(id);
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
  };

  const closeDeleteDialog = () => {
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  };

  const handleDelete = async () => {
    closeDeleteDialog();
    setLoading(true);
    try {
      await axiosClient.delete(`/post/${selectedPostId}`);
      alert("Xóa bài viết thành công!");

      // Nếu xóa bài viết cuối cùng của trang hiện tại (và không phải trang 1), lùi về trang trước
      if (posts.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchPosts();
      }
    } catch (err) {
      alert("Không thể xóa bài viết. Vui lòng thử lại sau.");
      console.error("Lỗi khi xóa:", err);
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    const request = ++requestId.current;
    setError("");
    try {
      // Dùng axios params thay vì nối chuỗi trực tiếp để tự động mã hóa ký tự đặc biệt, gọi endpoint quản trị /post/manage
      const res = await axiosClient.get("/post/manage", {
        params: {
          pageNumber: page,
          pageSize: pageSize,
          searchTerm: searchTerm || undefined,
          ...(status !== "all" ? { status } : {}),
        },
      });
      if (request !== requestId.current) return;
      setPosts(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotalRecords(res.data?.totalRecords || 0);
    } catch (err) {
      if (request === requestId.current) setError("Không tải được danh sách bài viết. Vui lòng thử lại.");
      console.error("Không thể lấy danh sách các bài viết:", err);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPosts();
    return () => { requestId.current++; };
  }, [page, searchTerm, status]);

  return (
    <>
      {isLoading ? (
        <div
          className="d-flex justify-content-center align-items-center gap-2"
          style={{ height: "100vh" }}
          data-testid="admin-loading"
        >
          <div className="spinner-grow text-primary" role="status"></div>
          <div className="spinner-grow text-primary" role="status"></div>
          <div className="spinner-grow text-primary" role="status"></div>
        </div>
      ) : (
        <div className="container py-4">
          {/* Dialog xác nhận xóa lịch sự, chuyên nghiệp */}
          <dialog
            ref={dialogRef}
            className="rounded shadow p-4 border-0"
            style={{ maxWidth: "450px" }}
            data-testid="delete-dialog"
          >
            <div className="text-center mb-3">
              <i className="bi bi-exclamation-circle text-danger display-5"></i>
              <h4 className="mt-2 fw-bold">Xác nhận xóa bài viết</h4>
              <p className="text-muted">
                Bạn có chắc chắn muốn xóa bài viết này không? Dữ liệu sau khi xóa sẽ không thể phục hồi.
              </p>
            </div>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-secondary px-4"
                onClick={closeDeleteDialog}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger px-4"
                onClick={handleDelete}
                data-testid="confirm-delete-button"
              >
                Xác nhận xóa
              </button>
            </div>
          </dialog>

          <h1 className="mb-4 fw-bold">Quản lý bài viết (Post Manager)</h1>

          <div className="d-flex justify-content-between align-items-center gap-2 mb-4">
            <div className="input-group w-75 shadow-sm">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm bài viết theo tiêu đề..."
                value={inputFind}
                onChange={(e) => setInputFind(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFind()}
                data-testid="admin-search-input"
              />
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleFind}
                data-testid="admin-search-button"
              >
                <i className="bi bi-search me-1"></i> Tìm
              </button>
              {(searchTerm || inputFind) && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={handleClearFind}
                  title="Xóa lọc"
                  data-testid="admin-clear-button"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>

            <Link
              to={"/admin-dashboard-80820508/create-post-80820508"}
              className="btn btn-success text-white shadow-sm"
            >
              <i className="bi bi-plus-lg me-1"></i>
              <span>+ THÊM BÀI VIẾT</span>
            </Link>
          </div>

          <div className="d-flex align-items-center gap-2 mb-3">
            <label htmlFor="post-status">Trạng thái</label>
            <select id="post-status" className="form-select w-auto" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">Tất cả</option><option value="draft">Nháp</option><option value="published">Đã xuất bản</option>
            </select>
          </div>
          {error && <p role="alert" className="text-danger">{error} <button className="btn btn-link" onClick={fetchPosts}>Thử lại</button></p>}
          {searchTerm && (
            <div className="mb-3 text-muted small">
              Kết quả tìm kiếm cho: <strong>"{searchTerm}"</strong> ({totalRecords} bài viết)
            </div>
          )}

          <div className="table-responsive shadow-sm rounded">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" style={{ width: "80px" }}>STT</th>
                  <th scope="col">Tiêu đề (Title)</th>
                  <th scope="col">Tác giả (Author)</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Lượt xem</th>
                  <th scope="col" className="text-center" style={{ width: "300px" }}>Thao tác (Action)</th>
                </tr>
              </thead>
              <tbody>
                {posts?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted" data-testid="admin-empty-posts">
                      <i className="bi bi-inbox display-6 text-secondary d-block mb-2"></i>
                      Không tìm thấy bài viết nào.
                    </td>
                  </tr>
                ) : (
                  posts?.map((item, index) => (
                    <tr key={item?.id} data-testid={`admin-post-row-${item?.id}`}>
                      <th scope="row">{(page - 1) * pageSize + index + 1}</th>
                      <td className="fw-semibold">{item?.title}</td>
                      <td className="text-muted">{item?.authorName}</td>
                      <td><span className={item.isPublished ? "badge bg-success" : "badge bg-secondary"}>{item.isPublished ? "Đã xuất bản" : "Nháp"}</span></td>
                      <td>{item.viewCount ?? 0}</td>
                      <td>
                        <div className="d-flex justify-content-center gap-2">
                          <Link to={`/admin-dashboard-80820508/preview-post-80820508/${item.id}`} className="btn btn-outline-secondary btn-sm">Xem trước</Link>
                          <Link
                            to={`/admin-dashboard-80820508/edit-post-80820508/${item?.id}`}
                            className="btn btn-outline-primary btn-sm px-3"
                          >
                            <i className="bi bi-pencil me-1"></i>Sửa
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm px-3"
                            onClick={() => openDeleteDialog(item?.id)}
                            data-testid={`delete-btn-${item?.id}`}
                          >
                            <i className="bi bi-trash me-1"></i>Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Thanh phân trang hoàn thiện trong PostManager */}
          {totalPages > 1 && (
            <nav
              className="mt-4 d-flex flex-column align-items-center"
              aria-label="Phân trang quản lý bài viết"
              data-testid="admin-pagination"
            >
              <ul className="pagination shadow-sm">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    data-testid="admin-prev-page"
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
                      data-testid={`admin-page-${i + 1}`}
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
                    data-testid="admin-next-page"
                  >
                    Sau &raquo;
                  </button>
                </li>
              </ul>
              <div className="text-muted small">
                Trang {page} / {totalPages} (Tổng số: {totalRecords} bài viết)
              </div>
            </nav>
          )}
        </div>
      )}
    </>
  );
}
