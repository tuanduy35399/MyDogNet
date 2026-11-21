import { useEffect, useState } from "react";
import RichTextEditor, { uploadImage } from "../../../../components/Editor/RichTextEditor";
import "react-quill-new/dist/quill.snow.css";
import axiosClient from "../../../../api";
import { useNavigate, useParams } from "react-router-dom";
export default function UpdatePost() {
  const [isLoading, setLoading] = useState(true);
  const [isUploading, setUploading] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [data, setData] = useState({
    title: "",
    thumbnail: "",
    content: "",
    isPublished: false,
  });
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    setError("");
    const fetchData = async () => {
      try {
        const res = await axiosClient.get(`/post/manage/${id}`, { signal: controller.signal, timeout: 15000 });
        if (isMounted) {
          setData(res.data);
        }
      } catch (err) {
        if (isMounted) { setLoadFailed(true); setError("Không tải được bài viết hoặc bạn không có quyền chỉnh sửa."); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [id]);
  const handleSavePost = async (isPublished) => {
    if (editorBusy || isUploading || saving) return;
    if (/data:/i.test(data.content)) { setError('Ảnh base64 chưa được chuyển. Hãy tải lại ảnh qua nút chèn ảnh.'); return; }
    setError('');
    setSaving(true);
    const patchData = [
      { path: "/isPublished", op: "replace", value: isPublished },
      {
        path: "/title",
        op: "replace",
        value: data.title,
      },
      {
        path: "/content",
        op: "replace",
        value: data.content,
      },
      {
        path: "/thumbnail",
        op: "replace",
        value: data.thumbnail,
      },
    ];
    try {
      await axiosClient.patch(`/post/${id}`, patchData, {
        headers: {
          "Content-Type": "application/json-patch+json",
        },
      });

      navigate(-1);
    } catch (err) {
      console.log("Co loi khi cap nhat bai viet", err);
      if (err.response?.status === 401)
        setError("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
      else setError(err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : null) || "Cập nhật thất bại.");
    } finally {
      setLoading(false);
      setSaving(false);
    }
  };
  const handleContentChange = (content) => {
    setData(prev => ({ ...prev, content }));
  };
  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return null;
    setUploading(true);
    try { return await uploadImage(file); }
    catch (error) { alert(error.response?.data?.message || error.message); return null; }
    finally { setUploading(false); }
  };
  const onFileChange = async (e) => {
    const { name } = e.target;
    const url = await handleUpload(e);
    if (url) {
      setData((prev) => ({ ...prev, [name]: url }));
      alert(`Đã tải lên ${name} thành công!`);
    }
  };
  return (
    <>
      {isUploading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
          }}
        >
          <div className="spinner-border text-light" role="status"></div>
          <p className="text-white mt-3">Đang upload...</p>
        </div>
      )}

      {isLoading ? (
        <div
          className="d-flex justify-content-center align-items-center gap-2"
          style={{ height: "100vh" }}
        >
          <div className="spinner-grow text-primary" role="status"></div>
          <div className="spinner-grow text-primary" role="status"></div>
          <div className="spinner-grow text-primary" role="status"></div>
        </div>
      ) : loadFailed ? (
        <div className="container mt-4"><p role="alert">{error}</p><button className="btn btn-secondary" onClick={() => navigate(-1)}>Quay lại</button></div>
      ) : (
        <div className="container mt-4">
          <div className="card shadow-sm border-0">
            <div className="card-body">
            {error && <p role="alert" className="text-danger">{error}</p>}
              <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-3 mb-4">
                <div className="input-group input-group-lg flex-grow-1">
                  <span className="input-group-text fw-semibold">Title</span>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập tiêu đề bài viết..."
                    value={data?.title || ""}
                    onChange={(e) =>
                      setData({ ...data, title: e.target.value })
                    }
                  />
                </div>

                <div className="d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-4"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary px-4"
                    disabled={editorBusy || isUploading || saving}
                  onClick={() => handleSavePost(data.isPublished)}
                  >
                    {data.isPublished ? "Lưu thay đổi" : "Lưu nháp"}
                  </button>
                  <button type="button" className={data.isPublished ? "btn btn-outline-warning px-4" : "btn btn-success px-4"} disabled={editorBusy || isUploading || saving} onClick={() => handleSavePost(!data.isPublished)}>{data.isPublished ? "Thu hồi về nháp" : "Xuất bản"}</button>
                </div>
              </div>
              <p className="text-start"><span className={data.isPublished ? "badge bg-success" : "badge bg-secondary"}>{data.isPublished ? "Đã xuất bản" : "Nháp"}</span> · Tác giả: {data.authorName} · Cập nhật: {data.updatedAt ? new Date(data.updatedAt).toLocaleString("vi-VN") : ""}</p>
              <div className="mb-3 text-start">
                <label className="form-label fw-bold">Thumbnail</label>
                {data?.thumbnail && (
                  <img
                    src={data?.thumbnail}
                    alt="thumbnail"
                    className="d-block mb-2 rounded"
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                    }}
                  />
                )}
                <input
                  className="form-control"
                  type="file"
                  name="thumbnail"
                  onChange={onFileChange}
                />
              </div>
              <RichTextEditor
                theme="snow"
                value={data?.content || ""}
                onBusyChange={setEditorBusy}
              onChange={handleContentChange}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
