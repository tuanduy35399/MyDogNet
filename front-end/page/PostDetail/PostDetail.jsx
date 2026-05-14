import { useEffect, useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header/Header";
import { useParams } from "react-router-dom";
import axiosClient from "../../api";
import "./PostDetail.css"

export default function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const normalizeContent = (html) => {
    if (!html) return "";

    return html
      .replace(/&nbsp;/g, " ").
      replace(/\u00A0/g, " ");
  };
  useEffect(() => {
    window.scrollTo(0, 0);
    var isMounted = true
    const fetchData = async () => {
      try {
        var res = await axiosClient.get(`/post/${id}`); //lấy id từ path truyền vô đây
        setTimeout(() => {
          if (isMounted) {
            setPost(res.data);
            setIsLoading(false);
          }
        }, 800);
      } catch (err) {
        console.log(err)
      }
    }    
    fetchData()
    return () => {
      isMounted=false
    }
  }, [id]) //chay lai neu id thay doi
  return (
    <>
      <section>
        {isLoading ? (
          <div class="placeholder-glow">
            <div class="placeholder col-12" style={{ height: "330px" }}></div>
          </div>
        ) : (
          <Header bgURL={post?.thumbnail} />
        )}
        <div class="container my-5">
          <div class="row justify-content-center">
            <div class="col-lg-8">
              <div class="post-preview mb-5">
                {isLoading ? (
                  <div>
                    <p className="placeholder-glow ">
                      <span class="placeholder col-6"></span>
                    </p>
                    <p className="placeholder-glow ">
                      <span class="placeholder col-12"></span>
                    </p>
                    <p className="placeholder-glow ">
                      <span class="placeholder col-12"></span>
                    </p>
                    <p className="placeholder-glow ">
                      <span class="placeholder col-12"></span>
                    </p>
                  </div>
                ) : (
                  <div className="container py-4">
                    <h2 class="fw-bold mb-2 text-decoration-none text-dark">
                      {post?.title}
                    </h2>
                    <br />
                    <div
                      className="mb-3 lh-lg post-content "
                      dangerouslySetInnerHTML={{
                        __html: normalizeContent(post.content)
                      }}
                    ></div>

                    <hr class="my-4" />
                    <p class="text-muted small">
                      Posted by <strong>{post?.authorName}</strong> on{" "}
                      {post?.createdAt}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </section>
    </>
  );
}
