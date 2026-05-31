import { useState, useEffect } from "react";

export default function VisitorCounter() {
  const [views, setViews] = useState(0);

  useEffect(() => {
    // Thay "tuanduy35399-mywebsite" bằng một cái tên bất kỳ duy nhất cho web của bạn
    const namespace = "https://mydognet.vercel.app/";
    const key = "";

    // Gọi API để tăng số lượt truy cập lên 1 và lấy số mới nhất về
    fetch(`https://api.countapi.xyz/hit/${namespace}/${key}`)
      .then((res) => res.json())
      .then((data) => {
        setViews(data.value);
      })
      .catch((err) => console.log("Lỗi đếm số lượt truy cập:", err));
  }, []);

  return (
    <div className="text-white-50 small mt-2">
        Số lượt truy cập: <span className="text-white fw-bold">{views}</span>
    </div>
  );
}
