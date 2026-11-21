import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axiosClient from "../../../../api";
import "../../../PostDetail/PostDetail.css";

export default function PostPreview() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setPost(null);
    setError("");
    axiosClient.get(`/post/manage/${id}`, { signal: controller.signal, timeout: 15000 })
      .then(res => { if (!controller.signal.aborted) setPost(res.data); })
      .catch(() => { if (!controller.signal.aborted) setError("Không tải được bài viết hoặc bạn không có quyền xem trước."); });
    return () => controller.abort();
  }, [id]);

  return <article className="container py-4 text-start">
    <Link to="/admin-dashboard-80820508/post-manager-80820508">← Quản lý bài viết</Link>
    <h1 className="mt-3">Xem trước bài viết</h1>
    <p className="text-muted">Chế độ quản trị không ghi lượt xem công khai.</p>
    {error ? <p role="alert">{error}</p> : !post ? <p role="status">Đang tải bài viết…</p> : <>
      <span className={post.isPublished ? "badge bg-success" : "badge bg-secondary"}>{post.isPublished ? "Đã xuất bản" : "Nháp"}</span>
      <h2 className="mt-3">{post.title}</h2>
      <p>Tác giả: {post.authorName} · Lượt xem: {post.viewCount ?? 0}</p>
      <div className="post-content" dangerouslySetInnerHTML={{ __html: post.content }} />
      <Link className="btn btn-primary mt-3" to={`/admin-dashboard-80820508/edit-post-80820508/${post.id}`}>Chỉnh sửa</Link>
    </>}
  </article>;
}
