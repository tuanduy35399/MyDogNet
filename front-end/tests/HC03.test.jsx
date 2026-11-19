import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import PostDetail from "../page/PostDetail/PostDetail";
import Home from "../page/Home/Home";
import { UserProvider } from "../context/UserContext";
import axiosClient from "../api";

// Mock axiosClient
vi.mock("../api", () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(),
    },
  };
});

describe("Nhóm HC03: Sửa trạng thái tải không kết thúc khi lấy dữ liệu thất bại", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TC-HC03-01: Bài không tồn tại (404) -> Hiện thông báo 404 rõ ràng, không kẹt skeleton vô tận", async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === "/AboutMe") {
        return Promise.resolve({ data: [{ backGroundImg: "bg.jpg" }] });
      }
      return Promise.reject({
        response: {
          status: 404,
          data: { message: "Bài viết không tồn tại" },
        },
      });
    });

    render(
      <MemoryRouter initialEntries={["/post/2147483647"]}>
        <UserProvider>
          <Routes>
            <Route path="/post/:id" element={<PostDetail />} />
          </Routes>
        </UserProvider>
      </MemoryRouter>
    );

    // Ban đầu có skeleton loading
    expect(screen.getByTestId("header-skeleton")).toBeInTheDocument();

    // Chờ cho request 404 hoàn tất
    await waitFor(() => {
      expect(screen.queryByTestId("header-skeleton")).not.toBeInTheDocument();
      expect(screen.queryByTestId("content-skeleton")).not.toBeInTheDocument();
    });

    // Xác nhận hiển thị thông báo 404 thân thiện và nút về trang chủ
    const notFoundEl = screen.getByTestId("not-found-message");
    expect(notFoundEl).toBeInTheDocument();
    expect(notFoundEl).toHaveTextContent("404 - Không tìm thấy bài viết");
    expect(screen.getByRole("link", { name: /về trang chủ/i })).toBeInTheDocument();
  });

  it("TC-HC03-02: API lỗi 500 hoặc mất mạng -> Hiện thông báo sự cố kết nối kèm nút Thử lại, kết thúc loading", async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === "/AboutMe") {
        return Promise.resolve({ data: [{ backGroundImg: "bg.jpg" }] });
      }
      return Promise.reject({
        response: {
          status: 500,
          data: { message: "Internal Server Error" },
        },
      });
    });

    render(
      <MemoryRouter initialEntries={["/post/10"]}>
        <UserProvider>
          <Routes>
            <Route path="/post/:id" element={<PostDetail />} />
          </Routes>
        </UserProvider>
      </MemoryRouter>
    );

    // Chờ kết thúc loading và hiển thị thông báo lỗi
    await waitFor(() => {
      expect(screen.queryByTestId("header-skeleton")).not.toBeInTheDocument();
    });

    const errorEl = screen.getByTestId("error-message");
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveTextContent("Sự cố kết nối");

    // Có nút thử lại
    const retryBtn = screen.getByTestId("retry-button");
    expect(retryBtn).toBeInTheDocument();

    // Thử lại thành công
    axiosClient.get.mockImplementation((url) => {
      if (url === "/AboutMe") {
        return Promise.resolve({ data: [{ backGroundImg: "bg.jpg" }] });
      }
      return Promise.resolve({
        data: {
          id: 10,
          title: "Bài viết đã tải lại thành công",
          content: "<p>Nội dung kiểm thử hồi quy</p>",
          authorName: "tuanduyhandsome",
          createdAt: new Date().toISOString(),
        },
      });
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("post-content")).toBeInTheDocument();
      expect(screen.getByText("Bài viết đã tải lại thành công")).toBeInTheDocument();
    });
  });

  it("TC-HC03-03: Hồ sơ AboutMe lỗi -> Trang chủ Home không bị khóa vô hạn, danh sách bài vẫn hiển thị bình thường", async () => {
    // Giả lập AboutMe trả về lỗi 500
    axiosClient.get.mockImplementation((url) => {
      if (url === "/AboutMe") {
        return Promise.reject(new Error("Lỗi máy chủ hồ sơ"));
      }
      if (url === "/post" || url.startsWith("/post")) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 1,
                title: "Bài viết trang chủ 1",
                authorName: "tuanduy",
                createdAt: new Date().toISOString(),
              },
            ],
            totalPages: 1,
            totalRecords: 1,
          },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <UserProvider>
          <Home />
        </UserProvider>
      </MemoryRouter>
    );

    // Chờ xem Home có hiển thị nội dung không bị kẹt spinner không
    await waitFor(() => {
      expect(screen.queryByTestId("home-loading-spinner")).not.toBeInTheDocument();
      expect(screen.getByTestId("home-content")).toBeInTheDocument();
      expect(screen.getByTestId("home-content")).toBeVisible();
    });

    expect(screen.getByText("Bài viết trang chủ 1")).toBeInTheDocument();
  });

  it("TC-HC03-04: Đổi route nhanh giữa hai bài viết -> Hủy request cũ bằng AbortController, không ghi đè dữ liệu sai", async () => {
    let resolvePost1;
    const post1Promise = new Promise((resolve) => {
      resolvePost1 = resolve;
    });

    axiosClient.get.mockImplementation((url, config) => {
      if (url === "/AboutMe") {
        return Promise.resolve({ data: [{ backGroundImg: "bg.jpg" }] });
      }
      if (url === "/post/1") {
        return post1Promise;
      }
      if (url === "/post/2") {
        return Promise.resolve({
          data: {
            id: 2,
            title: "Tiêu đề bài viết số 2",
            content: "<p>Nội dung bài 2</p>",
            authorName: "Admin",
            createdAt: new Date().toISOString(),
          },
        });
      }
      return Promise.reject(new Error("404"));
    });

    function TestApp() {
      const navigate = useNavigate();
      return (
        <div>
          <button data-testid="nav-post-2" onClick={() => navigate("/post/2")}>
            Tới bài 2
          </button>
          <Routes>
            <Route path="/post/:id" element={<PostDetail />} />
          </Routes>
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={["/post/1"]}>
        <UserProvider>
          <TestApp />
        </UserProvider>
      </MemoryRouter>
    );

    // Chuyển nhanh sang bài 2 trước khi bài 1 phản hồi
    await act(async () => {
      fireEvent.click(screen.getByTestId("nav-post-2"));
    });

    // Chờ bài 2 hiển thị
    await waitFor(() => {
      expect(axiosClient.get).toHaveBeenCalledWith("/post/2", expect.anything());
      expect(screen.getByText("Tiêu đề bài viết số 2")).toBeInTheDocument();
    });

    // Giờ bài 1 mới trả về dữ liệu trễ
    await act(async () => {
      resolvePost1({
        data: {
          id: 1,
          title: "Tiêu đề bài viết số 1 (chậm)",
          content: "<p>Nội dung bài 1</p>",
          authorName: "Admin",
          createdAt: new Date().toISOString(),
        },
      });
    });

    // Khẳng định: Giao diện vẫn hiển thị bài 2, bài 1 không được ghi đè lên
    expect(screen.getByText("Tiêu đề bài viết số 2")).toBeInTheDocument();
    expect(screen.queryByText("Tiêu đề bài viết số 1 (chậm)")).not.toBeInTheDocument();
  });
});
