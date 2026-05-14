import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../../api";
import { useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
export default function UpdateAccount() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userName: "",
    describe: "",
    avatar: "",
    backGroundImg: "",
  });
  const { id } = useParams();
  const [isUploading, setUploading] = useState(false)
  const [isLoading, setLoading]= useState(true);
  useEffect(() => {
    const fetchAcc = async () => {
      try {
        var res = await axiosClient.get(`/account/${id}`);
        setFormData(res.data);
        
      } catch (err) {
        console.log("Khong the lay danh sach cac acc", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAcc();
  }, [id]);
  const handleChange = (content) => {
   
    setFormData((prev)=>({ ...prev, describe: content }));
  };
  //Cần tìm hiểu lại phần này
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return null;

    const fd = new FormData();
    fd.append("file", file); 
    setUploading(true);
    const token = localStorage.getItem("tk");
    
    try {
      const res = await axiosClient.post("/upload", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data.url; // Trả về URL từ Cloudinary
    } catch (err) {
      console.error("Lỗi upload:", err.response?.status);
      return null;
    } finally {
      setUploading(false);
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
    setLoading(true);
    try {
      await axiosClient.patch(`/account/${id}`, patchData, {
        headers: {
          "Content-Type": "application/json-patch+json",
          Authorization: `Bearer ${token}`, // NHÉT TOKEN VÀO ĐÂY
        },
      });
      alert("Cập nhật thông tin thành công!");
      navigate("/admin-dashboard-80820508/account-manager-80820508");
    } catch (err) {
      console.log("Lỗi rồi:", err.response?.status);
      if (err.response?.status === 401)
        alert("Phiên đăng nhập hết hạn, vui lòng login lại!");
      else alert("Cập nhật thất bại!");
    } finally {
      setLoading(false)
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
                    <ReactQuill
                      theme="snow"
                      value={formData?.describe || ""}
                      onChange={handleChange}
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
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <input
                      className="form-control"
                      type="file"
                      name="avatar"
                      onChange={onFileChange}
                    />
                  </div>

                  <div className="mb-3 text-start">
                    <label className="form-label fw-bold">
                      Background Image
                    </label>
                    {formData.backGroundImg && (
                      <img
                        src={formData.backGroundImg}
                        alt="bg"
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
      )}
    </>
  );
}
