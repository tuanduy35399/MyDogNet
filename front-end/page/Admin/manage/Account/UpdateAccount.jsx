
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../../../api";

export default function UpdateAccount() {
  const [acc, setAcc] = useState(null);
  useEffect(() => {
    const fetchAcc = async () => {
      try {
        var res = await axiosClient.patch("/account");
        setAcc(res.data);
      } catch (err) {
        console.log("Khong the lay danh sach cac acc", err);
      }
    };
    fetchAcc();
  });
  return (
    <div>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">STT</th>
            <th scope="col">UserName</th>
            <th scope="col">Handle</th>
          </tr>
        </thead>
        <tbody>
          {acc?.map((item, index) => (
            <tr>
              <th scope="row">{index + 1}</th>
              <td>{item?.userName}</td>
              <td className="d-flex gap-2 justify-content-center">
                <button type="button" class="btn btn-primary">
                  <Link
                    to={`/admin-dashboard-80820508/edit-post-80820508/${item?.id}`}
                  >
                    <span className="cl-white">Edit</span>
                  </Link>
                </button>
                <button type="button" class="btn btn-danger">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
