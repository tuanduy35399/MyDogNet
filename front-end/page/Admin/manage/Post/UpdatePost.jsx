import { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import axiosClient from "../../../../api";
import { useNavigate, useParams } from "react-router-dom";
export default function UpdatePost() {
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState({
    title: "",
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
        console.log(err)
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
    }
    finally {
      setLoading(false);
    }
  };
  const handleContentChange = (content) => {
    setData({ ...data, content: content });
  };
  return (
    <>
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
