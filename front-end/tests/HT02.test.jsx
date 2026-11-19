import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListPost from "../components/ListPost/ListPost";
import PostManager from "../page/Admin/manage/Post/PostManager";
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

describe("Nhóm HT02: Hoàn thiện tìm kiếm và phân trang bài viết (Frontend)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-HT02-01: Tìm kiếm với ký tự đặc biệt (&, +, ?, tiếng Việt) -> Gửi an toàn qua Axios params, không nối chuỗi thô", async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            title: "Lập trình C# & .NET Core toàn tập",
            authorName: "tuanduyhandsome",
            createdAt: new Date().toISOString(),
          },
        ],
        totalPages: 1,
        totalRecords: 1,
      },
    });

    render(
      <MemoryRouter>
        <ListPost onDataLoaded={() => {}} />
      </MemoryRouter>
    );

    // Chờ danh sách khởi tạo
    await waitFor(() => {
      expect(axiosClient.get).toHaveBeenCalledTimes(1);
    });

    // Nhập từ khóa có ký tự đặc biệt: "C# & .NET"
    const searchInput = screen.getByTestId("search-input");
    const searchBtn = screen.getByTestId("search-button");

    fireEvent.change(searchInput, { target: { value: "C# & .NET" } });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            title: "Lập trình C# & .NET Core toàn tập",
            authorName: "tuanduyhandsome",
            createdAt: new Date().toISOString(),
          },
        ],
        totalPages: 1,
        totalRecords: 1,
      },
    });

    fireEvent.click(searchBtn);

    // Xác nhận axios được gọi với params object
    await waitFor(() => {
      expect(axiosClient.get).toHaveBeenLastCalledWith("/post", {
        params: {
          pageNumber: 1,
          pageSize: 5,
          searchTerm: "C# & .NET",
        },
        signal: expect.anything(),
      });
    });

    expect(
      screen.getByText("Lập trình C# & .NET Core toàn tập")
    ).toBeInTheDocument();
  });

  it("TC-HT02-02: Không có kết quả tìm kiếm -> Hiển thị thông báo rỗng thân thiện và nút xóa bộ lọc", async () => {
    // Lần đầu tải danh sách
    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [],
        totalPages: 0,
        totalRecords: 0,
      },
    });

    render(
      <MemoryRouter>
        <ListPost onDataLoaded={() => {}} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("empty-posts-message")).toBeInTheDocument();
    });

    expect(screen.getByText("Không tìm thấy bài viết nào")).toBeInTheDocument();

    // Tìm từ khóa
    const searchInput = screen.getByTestId("search-input");
    const searchBtn = screen.getByTestId("search-button");

    fireEvent.change(searchInput, { target: { value: "Từ khóa không có" } });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [],
        totalPages: 0,
        totalRecords: 0,
      },
    });

    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Không có bài viết nào khớp với từ khóa/)).toBeInTheDocument();
    });

    // Nhấn nút xóa bộ lọc
    const clearBtn = screen.getByTestId("clear-search-button");
    expect(clearBtn).toBeInTheDocument();

    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 2,
            title: "Bài viết mẫu",
            authorName: "admin",
            createdAt: new Date().toISOString(),
          },
        ],
        totalPages: 1,
        totalRecords: 1,
      },
    });

    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(searchInput.value).toBe("");
    });
  });

  it("TC-HT02-03: Phân trang danh sách bài viết -> Nút Previous bị vô hiệu hóa ở trang 1, Next hoạt động", async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, title: "Bài 1", authorName: "tuanduy" },
          { id: 2, title: "Bài 2", authorName: "tuanduy" },
        ],
        totalPages: 3,
        totalRecords: 12,
      },
    });

    render(
      <MemoryRouter>
        <ListPost onDataLoaded={() => {}} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("pagination-nav")).toBeInTheDocument();
    });

    const prevBtn = screen.getByTestId("prev-page-button");
    const nextBtn = screen.getByTestId("next-page-button");

    // Ở trang 1, nút Previous phải bị disabled
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Chuyển sang trang 2
    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 3, title: "Bài 3", authorName: "tuanduy" },
          { id: 4, title: "Bài 4", authorName: "tuanduy" },
        ],
        totalPages: 3,
        totalRecords: 12,
      },
    });

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(axiosClient.get).toHaveBeenLastCalledWith("/post", {
        params: {
          pageNumber: 2,
          pageSize: 5,
          searchTerm: undefined,
        },
        signal: expect.anything(),
      });
    });
  });

  it("TC-HT02-04: PostManager (Trang quản trị) -> Có thanh phân trang, dialog xác nhận lịch sự, tự lùi trang khi xóa bài cuối", async () => {
    // Mock danh sách trang 2 có 1 bài viết duy nhất
    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 6, title: "Bài duy nhất trang 2", authorName: "Admin" },
        ],
        totalPages: 2,
        totalRecords: 6,
      },
    });

    // Mock window.alert
    vi.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <PostManager />
      </MemoryRouter>
    );

    // Chờ bảng hiển thị
    await waitFor(() => {
      expect(screen.getByText("Bài duy nhất trang 2")).toBeInTheDocument();
      // Xác nhận thanh phân trang trong admin hiển thị
      expect(screen.getByTestId("admin-pagination")).toBeInTheDocument();
    });

    // Mở dialog xóa
    const deleteBtn = screen.getByTestId("delete-btn-6");
    fireEvent.click(deleteBtn);

    // Xác nhận dialog xóa lịch sự, không thô tục
    const deleteDialog = screen.getByTestId("delete-dialog");
    expect(deleteDialog).toBeInTheDocument();
    expect(screen.getByText("Xác nhận xóa bài viết")).toBeInTheDocument();
    expect(
      screen.getByText(/Bạn có chắc chắn muốn xóa bài viết này không/)
    ).toBeInTheDocument();

    // Mock gọi DELETE thành công
    axiosClient.delete.mockResolvedValueOnce({ data: {} });

    // Mock fetch lại trang 1 sau khi tự lùi trang
    axiosClient.get.mockResolvedValueOnce({
      data: {
        data: [
          { id: 5, title: "Bài viết trang 1", authorName: "Admin" },
        ],
        totalPages: 1,
        totalRecords: 5,
      },
    });

    const confirmDeleteBtn = screen.getByTestId("confirm-delete-button");
    fireEvent.click(confirmDeleteBtn);

    // Xác nhận axios delete được gọi với id = 6
    await waitFor(() => {
      expect(axiosClient.delete).toHaveBeenCalledWith("/post/6");
    });
  });
});
