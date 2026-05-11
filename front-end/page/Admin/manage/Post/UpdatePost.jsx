import { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import axiosClient from "../../../../api";
import { useParams } from "react-router-dom";
export default function UpdatePost() {
  const [data, setData] = useState({ title: "", content: "" });
  const { id } = useParams();
  
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await axiosClient.get(`/post/${id}`);
        if (isMounted) {
          setData(res.data);
        }
        alert("Lay du lieu thanh cong");
      } catch (err) {
        console.log("Loi lay du lieu", err);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]) 

    const handleContentChange = (content) => {
      setData({ ...data, content: content });
    };
  return (
    <div className="container">
      <ReactQuill theme="snow" value={data?.content || ""} onChange={handleContentChange} />
      <div className="d-flex gap-2 mt-3 ">
        <button type="button" class="btn btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-primary"
          
        >
          Save
        </button>
      </div>
    </div>
  );
}
