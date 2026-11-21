import { useEffect, useRef, useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header/Header";
import { useParams, useLocation, Link } from "react-router-dom";
import axiosClient from "../../api";
import "./PostDetail.css";
import { useUser } from "../../context/UserContext";

export default function PostDetail() {
  const { id } = useParams();
  const location = useLocation();
  const openKey = `${location.key}:${id}`;
  const { user } = useUser();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // '404' | 'error' | null
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedFor, setLoadedFor] = useState(null);
  const viewAttempt = useRef(null);
  const [viewResult, setViewResult] = useState(null);

  useEffect(() => {
    if (isLoading || errorType || loadedFor !== openKey || String(post?.id) !== id || post?.isPublished === false) return;
    // Reuse the same promise if StrictMode replays this effect. Never retry an
    // uncertain POST automatically: it may already have committed in SQL.
    if (viewAttempt.current?.key !== openKey) {
      viewAttempt.current = { key: openKey, promise: axiosClient.post(`/post/${id}/view`, null, { timeout: 15000 }) };
    }
    let active = true;
    viewAttempt.current.promise.then(res => {
      if (active) setViewResult({ key: openKey, count: res.data.viewCount });
    }).catch(() => {
      if (active) setViewResult({ key: openKey, failed: true });
    });
    return () => { active = false; };
  }, [id, openKey, loadedFor, post?.id, isLoading, errorType]);

  const normalizeContent = (html) => {
    if (!html) return "";
    return html.replace(/&nbsp;/g, " ").replace(/\u00A0/g, " ");
  };

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

  useEffect(() => {
    window.scrollTo(0, 0);
    const controller = new AbortController();

    // Timeout 15 giay de tu dong huy request neu mang qua cham / treo
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);

    const fetchData = async () => {
      setIsLoading(true);
      setErrorType(null);
      setErrorMessage("");

      try {
        const res = await axiosClient.get(`/post/${id}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setPost(res.data);
          setLoadedFor(openKey);
          setErrorType(null);
        }
      } catch (err) {
        // Neu bi huy do unmount hoac chuyen route nhanh giua cac bai viet thi bo qua
        if (
          controller.signal.aborted ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }

        if (err?.response?.status === 404) {
          setErrorType("404");
          setErrorMessage("Không tìm thấy bài viết hoặc bài viết đã bị xóa.");
        } else if (err?.code === "ECONNABORTED" || err?.name === "AbortError") {
          setErrorType("error");
          setErrorMessage("Yêu cầu hết thời gian chờ (15 giây). Vui lòng thử lại.");
        } else {
          setErrorType("error");
          setErrorMessage(
            err?.response?.data?.message ||
              "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại."
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [id, openKey, reloadKey]);

  return (
    <>
      <section>
        {isLoading ? (
          <div className="placeholder-glow">
            <div
              className="placeholder col-12"
              style={{ height: "330px" }}
              data-testid="header-skeleton"
            ></div>
          </div>
        ) : (
          <Header bgURL={post?.thumbnail || user?.backGroundImg} />
        )}

        <div className="container my-5">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="post-preview mb-5">
                {isLoading ? (
                  <div data-testid="content-skeleton">
                    <p className="placeholder-glow">
                      <span className="placeholder col-6"></span>
                    </p>
                    <p className="placeholder-glow">
                      <span className="placeholder col-12"></span>
                    </p>
                    <p className="placeholder-glow">
                      <span className="placeholder col-12"></span>
                    </p>
                    <p className="placeholder-glow">
                      <span className="placeholder col-12"></span>
                    </p>
                  </div>
                ) : errorType === "404" ? (
                  <div
                    className="alert alert-warning text-center py-5 shadow-sm rounded"
                    data-testid="not-found-message"
                  >
                    <i className="bi bi-exclamation-triangle display-4 text-warning mb-3 d-block"></i>
                    <h3 className="fw-bold">404 - Không tìm thấy bài viết</h3>
                    <p className="text-muted mb-4">{errorMessage}</p>
                    <Link to="/" className="btn btn-primary px-4">
                      <i className="bi bi-arrow-left me-2"></i>Về trang chủ
                    </Link>
                  </div>
                ) : errorType === "error" ? (
                  <div
                    className="alert alert-danger text-center py-5 shadow-sm rounded"
                    data-testid="error-message"
                  >
                    <i className="bi bi-wifi-off display-4 text-danger mb-3 d-block"></i>
                    <h3 className="fw-bold">Sự cố kết nối</h3>
                    <p className="text-muted mb-4">{errorMessage}</p>
                    <div className="d-flex justify-content-center gap-3">
                      <button
                        className="btn btn-danger px-4"
                        onClick={() => setReloadKey((k) => k + 1)}
                        data-testid="retry-button"
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>Thử lại
                      </button>
                      <Link to="/" className="btn btn-outline-secondary px-4">
                        Về trang chủ
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="container py-4" data-testid="post-content">
                    <h2 className="fw-bold mb-2 text-decoration-none text-dark">
                      {post?.title}
                    </h2>
                    <br />
                    <p className="text-muted small">
                      Posted by <strong>{post?.authorName}</strong> on{" "}
                      {formatDate(post?.createdAt)}
                      {" · "}<span data-testid="post-view-count">Lượt xem: {viewResult?.key === openKey && !viewResult.failed ? viewResult.count : (post?.viewCount ?? 0)}</span>
                    </p>
                    {viewResult?.key === openKey && viewResult.failed && <p className="text-muted small" role="status">Chưa cập nhật được lượt xem. Bạn vẫn có thể đọc bài viết.</p>}
                    <hr className="my-4" />
                    <div
                      className="mb-3 lh-lg post-content"
                      dangerouslySetInnerHTML={{
                        __html: normalizeContent(post?.content || ""),
                      }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </section>
    </>
  );
}
