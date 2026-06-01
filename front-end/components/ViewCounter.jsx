import { useState, useEffect } from "react";

export default function VisitorCounter() {
  const [views, setViews] = useState(0);

  useEffect(() => {
    // Gọi endpoint cục bộ, khi deploy lên Vercel nó sẽ tự hiểu
    fetch("/vercel-counter")
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
import { Counter } from "counterapi";

// Create a counter client
const counter = new Counter({ workspace: "my-workspace" });

// Track an event
async function trackEvent() {
  try {
    const result = await counter.up("api-calls");
    console.log(`Total API calls: ${result.value}`);
  } catch (error) {
    console.error("Failed to track event:", error.message);
  }
}

trackEvent();