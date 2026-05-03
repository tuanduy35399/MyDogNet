import { useEffect, useState } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header/Header";
import { useParams } from "react-router-dom";
import axios from "axios";
export default function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  useEffect( () => {
    const fetchData = async () => {
      try {
        var res = await axios.get(`https://localhost:7085/post/${id}`) //lấy id từ path truyền vô đây
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
        <h1>{post?.title}</h1>
        <h2>{post?.authorName}</h2>
        <h6>{post?.createdAt}</h6>
        <p>{post?.content}</p>
        <Footer />
      </section>
    );
}
