import { useEffect, useState, useRef, use } from "react";
import axiosClient from "../../../../api";
import { Link } from "react-router-dom";

export default function PostManager() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1); //mac dinh la trang 1
  const [totalPages, setTotalPages] = useState(1); //mac dinh tong so tang la 1
  const pageSize = 5; //So luong bai viet xuat hien o moi trang
  const [isLoading, setLoading] = useState(true);
  const [inputFind, setInputFind] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  //Luu id bai viet duoc chon de xoa
  const [selectedPostId, setSelectedPostId] = useState(null);
  //xu ly tim kiem bai viet
  const handleFind = () => {
    setPage(1); //set ve trang 1 moi khi nhan nut tim kiem
    setSearchTerm(inputFind); //gan gia tri duoc go vao setSearchTerm de chay UseEffect
  };
  //Ref xu dung de dong/mo dialog thay cho getElementById truyen thong
  const dialogRef = useRef(null);

  //Ham xu ly dong/mo dialog
  const openDeleteDialog = (id) => {
    setSelectedPostId(id);
    dialogRef.current.showModal(); //mo dialog
  };
  const closeDeleteDialog = () => {
    dialogRef.current.close(); //dong dialog
  };
  const handleDelete = async () => {
    setLoading(true);
    try {
      await axiosClient.delete(`/post/${selectedPostId}`);
      alert("Xoa bai viet thanh cong");
      closeDeleteDialog();
      fetchPosts();
    } catch (err) {
      alert("Khong the xoa bai viet");
      console.error("Lỗi khi xóa:", err);
    } finally {
      setLoading(false);
    }
  };
  const fetchPosts = async () => {
    try {
      var res = await axiosClient.get(
        `/post?pageNumber=${page}&pageSize=${pageSize}&searchTerm=${searchTerm}`,
      );
      setPosts(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      
      /*
        Ban đầu ta chưa biết được có total nhiêu trang, nên ta mới để mặc định total là 1
        Và quy định pageSize là 5
        Đây là mẫu kết quả trả về res.data, 
        do đó ta cần biết thêm thông tin cụ thể trong data 1 cái nữa, mà res.data.data chính là 1 mảng
        {
  "data": [
    {
      "id": 5,
      "title": "Mô hình Agile Scrum",
      "thumbnail": "https://res.cloudinary.com/db0315mif/image/upload/v1777184228/default_background_i13wjr.jpg",
      "createdAt": "2026-05-02T15:20:28.4644903",
      "updatedAt": "2026-05-02T15:20:28.4644914",
      "viewCount": 0,
      "authorName": "tuanduyhandsome"
    }
  ],
  "totalRecords": 1,
  "pageNumber": 1,
  "pageSize": 5,
  "totalPages": 1
}
        */
    } catch (err) {
      console.log("Khong the lay danh sach cac post", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    window.scrollTo(0, 0);

    fetchPosts();
  }, [page, searchTerm]);
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
        <div>
          <dialog
            ref={dialogRef}
            style={{ border: "none", borderRadius: "8px", padding: "20px" }}
          >
            <h3>Mày có chắc là muốn xóa nó không?</h3>
            <p>Xóa rồi là đ*o khôi phục lại được nha con</p>
            <div className="d-flex gap-2">
              <button className="btn btn-secondary" onClick={closeDeleteDialog}>
                Thôi thôi
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Xóa mẹ đi
              </button>
            </div>
          </dialog>
          <h1 className="mb-4">Post Manager</h1>
          <div className="d-flex justify-content-between align-items-center gap-2">
            <div class="search-container d-flex w-75">
              <input
                type="text"
                class="form-control search-input"
                placeholder="Type something..."
                value={inputFind}
                onChange={(e) => setInputFind(e.target.value)}
                onKeyDown={(e) => e.key == "Enter" && handleFind()}
              />
            </div>
            <Link
              to={"/admin-dashboard-80820508/create-post-80820508"}
              className="btn btn-primary text-white"
            >
              <span className="text-white text-decoration-none">
                + NEW POST
              </span>
            </Link>
          </div>
          <table class="table mt-3">
            <thead>
              <tr>
                <th scope="col">STT</th>
                <th scope="col">Title</th>
                <th scope="col">Author</th>
                <th scope="col">Handle</th>
              </tr>
            </thead>
            <tbody>
              {posts?.map((item, index) => (
                <tr>
                  <th scope="row">{index + 1}</th>
                  <td>{item?.title}</td>
                  <td>{item?.authorName}</td>
                  <td>
                    <div className="d-flex gap-2 flex-nowrap">
                      <button type="button" class="btn btn-primary">
                        <Link
                          to={`/admin-dashboard-80820508/edit-post-80820508/${item?.id}`}
                        >
                          <span className="text-white text-decoration-none">
                            Edit
                          </span>
                        </Link>
                      </button>
                      <button
                        type="button"
                        class="btn btn-danger"
                        onClick={() => openDeleteDialog(item?.id)}
                      >
                        <span className="text-white text-decoration-none">
                          Delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
