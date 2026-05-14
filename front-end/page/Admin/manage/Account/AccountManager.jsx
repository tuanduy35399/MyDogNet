
import { use, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../../../api";

export default function AccountManager() {
  const [acc, setAcc] = useState(null);
  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    let isMounted = true;
    const fetchAcc = async () => {
      
      try {
        var res = await axiosClient.get("/account");
        if(isMounted) setAcc(res.data);
      } catch (err) {
        console.log("Khong the lay danh sach cac acc", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAcc();
    return () => {
      isMounted = false;
    }
  });
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
          <h1 className="mb-4">Account Manager</h1>
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
                  <td className="d-flex gap-2 ">
                    <button type="button" class="btn btn-primary">
                      <Link
                        to={`/admin-dashboard-80820508/edit-account-80820508/${item?.id}`}
                      >
                        <span className="text-white text-decoration-none">
                          Edit
                        </span>
                      </Link>
                    </button>
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
