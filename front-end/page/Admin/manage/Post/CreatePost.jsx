import { useState } from "react";
import RichTextEditor, { uploadImage } from "../../../../components/Editor/RichTextEditor";
import "react-quill-new/dist/quill.snow.css";
import axiosClient from "../../../../api";
import { useNavigate } from "react-router-dom";
export default function CreatePost() {
  const [isUploading, setUploading] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    title: "",
    content: "",
    thumbnail: null,
    isPublished: false,
  });
  const navigate = useNavigate();

  const handleSavePost = async (isPublished) => {
    if (editorBusy || isUploading || saving) return;
    if (/data:/i.test(data.content)) { setError('Ảnh base64 chưa được chuyển. Hãy tải lại ảnh qua nút chèn ảnh.'); return; }
    setError('');
    setSaving(true);
    try {
      await axiosClient.post(`/post`, { ...data, isPublished }, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      navigate("/admin-dashboard-80820508/post-manager-80820508");
    } catch (err) {
      console.log("Co loi khi cap nhat bai viet", err);
      if (err.response?.status === 401)
        setError("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
      else setError(err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : null) || "Đăng bài thất bại.");
    } finally { setSaving(false); }
  };
  const handleContentChange = (content) => {
    setData((prev) => ({
      ...prev,
      content,
    }));
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
                  onChange={(e) => setData(prev=> ({ ...prev, title: e.target.value }))}
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
                  onClick={() => handleSavePost(false)}
                >
                  Lưu nháp
                </button>
                <button type="button" className="btn btn-success px-4" disabled={editorBusy || isUploading || saving} onClick={() => handleSavePost(true)}>Xuất bản</button>
              </div>
            </div>
            <p className="text-muted text-start">Bài lưu nháp chỉ có chủ bài và quản trị viên được xem.</p>
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
    </>
  );
}
