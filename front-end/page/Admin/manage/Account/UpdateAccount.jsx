import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../../api";
import { useParams } from "react-router-dom";
export default function UpdateAccount() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userName: "",
    describe: "",
    avatar: "",
    backGroundImg: "",
  });
  const { id } = useParams();
  let isUploading = false //luc dau thi cai nay chua co upload nen chua bat
  useEffect(() => {
    const fetchAcc = async () => {
      try {
        var res = await axiosClient.get(`/account/${id}`);
        setFormData(res.data);
      } catch (err) {
        console.log("Khong the lay danh sach cac acc", err);
      }
    };
    fetchAcc();
  }, [id]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  //Cần tìm hiểu lại phần này
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return null;

    const fd = new FormData();
    fd.append("file", file); // Key "file" phải khớp với IFormFile file ở Backend

    const token = localStorage.getItem("tk");
    try {
      const res = await axiosClient.post("/upload", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });
      isUploading = false;
      return res.data.url; // Trả về URL từ Cloudinary
    } catch (err) {
      console.error("Lỗi upload:", err.response?.status);
      return null;
    }
  };
  const onFileChange = async (e) => {
    const name = e.target.name;
    const url = await handleUpload(e);
    if (url) {
      setFormData((prev) => ({ ...prev, [name]: url }));
      alert(`Đã tải lên ${name} thành công!`);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("tk");
    const patchData = [
      { op: "replace", path: "/describe", value: formData.describe },
      { op: "replace", path: "/Avatar", value: formData.avatar },
      { op: "replace", path: "/backGroundImg", value: formData.backGroundImg },
    ];
    try {
      await axiosClient.patch(`/account/${id}`, patchData, {
        headers: {
          "Content-Type": "application/json-patch+json",
          Authorization: `Bearer ${token}`, // NHÉT TOKEN VÀO ĐÂY
        },
      });
      alert("Cập nhật thông tin thành công!");
    } catch (err) {
      console.log("Lỗi rồi:", err.response?.status);
      if (err.response?.status === 401)
        alert("Phiên đăng nhập hết hạn, vui lòng login lại!");
      else alert("Cập nhật thất bại!");
    }
  };

  return (
    <div className="container mt-5 d-flex justify-content-center">
      <div className="card shadow" style={{ width: "40rem" }}>
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Cập nhật thông tin tài khoản</h4>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3 text-start">
              <label className="form-label fw-bold">UserName</label>
              <input
                type="text"
                name="userName"
                className="form-control bg-light"
                value={formData.userName}
                onChange={handleChange}
                disabled // Thường UserName không cho sửa, nếu cho thì xóa 'disabled'
              />
            </div>

            <div className="mb-3 text-start">
              <label className="form-label fw-bold">Describle</label>
              <textarea
                type="text"
                name="describe"
                className="form-control"
                value={formData.describe}
                onChange={handleChange}
                required
              />
            </div>

            {/* Avatar */}
            <div className="mb-3 text-start">
              <label className="form-label fw-bold">Avatar</label>
              {formData.avatar && (
                <img
                  src={formData.avatar}
                  alt="avatar"
                  className="d-block mb-2 rounded-circle"
                  style={{ width: "70px", height: "70px", objectFit: "cover" }}
                />
              )}
              <input
                className="form-control"
                type="file"
                name="avatar"
                onChange={onFileChange}
              />
            </div>

            {/* Background Image */}
            <div className="mb-3 text-start">
              <label className="form-label fw-bold">Background Image</label>
              {formData.backGroundImg && (
                <img
                  src={formData.backGroundImg}
                  alt="bg"
                  className="d-block mb-2 rounded"
                  style={{ width: "100%", height: "100px", objectFit: "cover" }}
                />
              )}
              <input
                className="form-control"
                type="file"
                name="backGroundImg"
                onChange={onFileChange}
              />
            </div>

            <div className="d-flex gap-2 justify-content-end mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-success">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
