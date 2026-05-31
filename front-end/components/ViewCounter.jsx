import { useState, useEffect } from "react";

export default function VisitorCounter() {
  const [views, setViews] = useState(0);

  useEffect(() => {
    // Gọi endpoint cục bộ, khi deploy lên Vercel nó sẽ tự hiểu
    fetch("/api/views")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.views) setViews(data.views);
      })
      .catch((err) => console.error("Lỗi lấy view từ Vercel KV:", err));
  }, []);

  return (
    <div className="text-white-50 small mt-2">
      Số lượt truy cập: <span className="text-white fw-bold">{views}</span>
    </div>
  );
}
