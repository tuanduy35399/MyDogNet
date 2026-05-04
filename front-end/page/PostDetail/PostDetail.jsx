import { useEffect, useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header/Header";
import { useParams } from "react-router-dom";
import axiosClient from "../../api";
export default function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  useEffect( () => {
    const fetchData = async () => {
      try {
        var res = await axiosClient.get(`/post/${id}`); //lấy id từ path truyền vô đây
        setPost(res.data)
      } catch (err) {
        console.log(err)
      }
    }    
    fetchData();
  }, [id]) //chay lai neu id thay doi
    return (
      <section>
        <Header bgURL={post?.thumbnail} />
        {/* <span class="badge rounded-pill bg-secondary">zappos</span> */}
        <div class="container my-5">
          <div class="row justify-content-center">
            <div class="col-lg-8">
              <div class="post-preview mb-5">
                  <h2 class="fw-bold mb-2 text-decoration-none text-dark">
                    {post?.title}
                  </h2>
                  <br />
                  <h3 class="fw-light text-muted mb-3">{post?.content}</h3>
                <hr class="my-4" />
                <p class="text-muted small">
                  Posted by <strong>{post?.authorName}</strong> on{" "}
                  {post?.createdAt}
                </p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </section>
    );
}
