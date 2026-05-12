import { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import axiosClient from "../../../../api";
import { useNavigate, useParams } from "react-router-dom";
export default function UpdatePost() {
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
      } catch (err) {
        console.log("Loi lay du lieu", err);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);
  const handleSavePost = async () => {
    try {
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
      await axiosClient.patch(`/post/${id}`, patchData, {
        headers: {
          "Content-Type": "application/json-patch+json",
          Authorization: `Bearer: ${token}`,
        },
      });
      alert("Cập nhật bai viet thành công!");
    } catch (err) {
      console.log("Co loi khi cap nhat bai viet", err);
      if (err.response?.status === 401)
        alert("Phiên đăng nhập hết hạn, vui lòng login lại!");
      else alert("Co loi khi cap nhat bai dang");
    }
  };
  const handleContentChange = (content) => {
    setData({ ...data, content: content });
  };
  return (
    <div className="container">
      <div class="input-group input-group-lg">
        <div class="input-group-prepend">
          <span class="input-group-text" id="inputGroup-sizing-lg">
            Title
          </span>
        </div>
        <input
          type="text"
          class="form-control"
          aria-label="Large"
          aria-describedby="inputGroup-sizing-sm"
          value={data?.title}

        />
      </div>
      <ReactQuill
        theme="snow"
        value={data?.content || ""}
        onChange={handleContentChange}
      />
      <div className="d-flex gap-2 mt-3 ">
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => navigate(-1)}
        >
          Cancel
        </button>
        <button type="button" class="btn btn-primary" onClick={handleSavePost}>
          Save
        </button>
      </div>
    </div>
  );
}
