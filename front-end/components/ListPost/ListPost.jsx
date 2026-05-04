import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api";

export default function ListPost() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        var res = await axiosClient.get("/post");
        var reverseData = [...res.data].reverse();
        setPosts(reverseData);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {posts.map((item) => (
        <div
          className="container d-flex justify-content-center mt-5"
          key={item?.id}
        >
          <div className="card" style={{ width: "50rem", overflow: "hidden" }}>
            <img
              className="card-img-top"
              src={item?.thumbnail}
              alt="Card image cap"
              style={{ height: "250px", objectFit: "cover" }}
            />
            <div className="card-body text-start">
              <h3 className="card-text">{item?.title}</h3>
              <p className="card-text">Author: {item?.authorName}</p>
              <p className="card-text">Created at: {item?.createdAt}</p>
              <p className="card-text">Last Update: {item?.updatedAt}</p>
              <Link to={`/post/${item?.id}`} class="btn btn-primary">
                READ MORE
              </Link>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
