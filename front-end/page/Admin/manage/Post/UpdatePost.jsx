import { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import axiosClient from "../../../../api";
import { useNavigate, useParams } from "react-router-dom";
export default function UpdatePost() {
  const [isLoading, setLoading] = useState(true);
  const [isUploading, setUploading] = useState(false);
  const [data, setData] = useState({
    title: "",
    thumbnail: "",
    content: "",
  });
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await axiosClient.get(`/post/${id}`);
        if (isMounted) {
          setData(res.data);
        }
        setLoading(false);
      } catch (err) {
        alert("Loi lay du lieu");
        console.log(err);
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);
  const handleSavePost = async () => {
    const token = localStorage.getItem("tk");
    const patchData = [
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
    setLoading(true);
    try {
      await axiosClient.patch(`/post/${id}`, patchData, {
        headers: {
          "Content-Type": "application/json-patch+json",
          Authorization: `Bearer ${token}`,
        },
      });
      alert("Cập nhật bai viet thành công!");
      navigate(-1);
    } catch (err) {
      console.log("Co loi khi cap nhat bai viet", err);
      if (err.response?.status === 401)
        alert("Phiên đăng nhập hết hạn, vui lòng login lại!");
      else alert("Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };
  const handleContentChange = (content) => {
    setData({ ...data, content: content });
  };
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    const token = localStorage.getItem("tk");
    try {
      const res = await axiosClient.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data.url; // Trả về URL từ Cloudinary
    } catch (err) {
      console.error("Lỗi upload status:", err.response?.status);
      console.error("Lỗi upload data:", err.response?.data);
      console.error("Lỗi upload message:", err.message);
      return null;
    } finally {
      setUploading(false);
    }
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
      ) : (
        <div className="container mt-4">
          <div className="card shadow-sm border-0">
            <div className="card-body">
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
                    onClick={handleSavePost}
                  >
                    Save
                  </button>
                </div>
              </div>
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
              <ReactQuill
                theme="snow"
                value={data?.content || ""}
                onChange={handleContentChange}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
