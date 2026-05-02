import axios from "axios";
import { useEffect, useState } from "react";

function ListPost() {
  const [posts, setPosts] = useState([]);
  const fetchData = async () => {
    try {
      var res = await axios.get("https://localhost:7085/post");
      setPosts(res.data);
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      {posts.map((item) => (
        <div
          className="container d-flex justify-content-center mt-5"
          key={item.id}
        >
          <div className="card" style={{ width: "50rem", overflow: "hidden" }}>
            <img
              className="card-img-top"
              src={item.thumbnail}
              alt="Card image cap"
              style={{ height: "250px", objectFit: "cover" }}
            />
            <div className="card-body text-start">
              <h3 className="card-text">{item.title}</h3>
              <p className="card-text">Author: {item.authorName}</p>
              <p className="card-text">Created at: {item.createdAt}</p>
              <p className="card-text">Last Update: {item.updatedAt}</p>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
export default ListPost;
