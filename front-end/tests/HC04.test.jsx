import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PostDetail from "../page/PostDetail/PostDetail";
import Header from "../components/Header/Header";
import { UserProvider } from "../context/UserContext";
import axiosClient from "../api";
import fs from "fs";
import path from "path";

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

describe("Nhóm HC04: Sửa ảnh và nội dung bị lệch hoặc tràn ngang trên điện thoại", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosClient.post.mockResolvedValue({ data: { viewCount: 1 } });
  });

  it("TC-HC04-01: Kiểm tra quy tắc CSS chống tràn ngang tại các viewport di động (320px, 360px, 390px)", () => {
    const postDetailCss = fs.readFileSync(
      path.resolve(__dirname, "../page/PostDetail/PostDetail.css"),
      "utf-8"
    );
    const indexCss = fs.readFileSync(
      path.resolve(__dirname, "../src/index.css"),
      "utf-8"
    );

    // Xác nhận có overflow-wrap: anywhere hoặc word-break: break-word
    expect(postDetailCss).toMatch(/overflow-wrap:\s*anywhere/);
    expect(postDetailCss).toMatch(/word-break:\s*break-word/);

    // Xác nhận pre và code có cuộn ngang nội bộ
    expect(postDetailCss).toMatch(/overflow-x:\s*auto/);

    // Xác nhận #root hoặc body có cấu hình không tràn màn hình
    expect(indexCss).toMatch(/box-sizing:\s*border-box/);
    expect(indexCss).toMatch(/overflow-x:\s*hidden/);
  });

  it("TC-HC04-02: Ảnh đa tỉ lệ và ảnh có inline style lớn -> Có max-inline-size: 100% và height: auto, không làm vỡ khung", () => {
    const postDetailCss = fs.readFileSync(
      path.resolve(__dirname, "../page/PostDetail/PostDetail.css"),
      "utf-8"
    );

    // Kiểm tra quy tắc cho ảnh trong nội dung bài viết
    expect(postDetailCss).toMatch(/max-inline-size:\s*100%/);
    expect(postDetailCss).toMatch(/max-width:\s*100%/);
    expect(postDetailCss).toMatch(/height:\s*auto/);
    expect(postDetailCss).toMatch(/block-size:\s*auto/);

    // Kiểm tra ghi đè inline-style của ảnh từ Quill editor
    expect(postDetailCss).toMatch(/img\[style\]/);
  });

  it("TC-HC04-03: Chuỗi dài (JWT / URL không ngắt) và khối code dài -> Được bọc trong container có class post-content với ngắt dòng an toàn", async () => {
    const longJwtString =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHRyYV92YWx1ZSI6ImFzZGZrYXNkZmpoYXNkZmtqYXNkZmhrYXNkZmpraGFzZGZqYXNkZmhqYXNkZmpraGFzZGZqYXNkZmhqYXNkZmpraCJ9";

    const mockPost = {
      id: 16,
      title: "Bài viết chứa mã token và mã nguồn dài",
      content: `
        <p>Chuỗi JWT dài: <span>${longJwtString}</span></p>
        <pre><code>function testLongCodeBlock() { console.log("${longJwtString}"); return 42; }</code></pre>
        <img src="https://example.com/huge-dog.jpg" style="width: 1200px; height: 800px;" alt="Chó lớn" />
      `,
      authorName: "tuanduyhandsome",
      createdAt: new Date().toISOString(),
    };

    axiosClient.get.mockImplementation((url) => {
      if (url === "/AboutMe") {
        return Promise.resolve({ data: [{ backGroundImg: "bg.jpg" }] });
      }
      return Promise.resolve({ data: mockPost });
    });

    render(
      <MemoryRouter initialEntries={["/post/16"]}>
        <UserProvider>
          <Routes>
            <Route path="/post/:id" element={<PostDetail />} />
          </Routes>
        </UserProvider>
      </MemoryRouter>
    );

    const postContent = await screen.findByText(/Chuỗi JWT dài:/i);
    expect(postContent).toBeInTheDocument();

    const contentContainer = document.querySelector(".post-content");
    expect(contentContainer).toBeInTheDocument();
    expect(contentContainer.innerHTML).toContain(longJwtString);
    expect(contentContainer.querySelector("pre")).toBeInTheDocument();
    expect(contentContainer.querySelector("img")).toBeInTheDocument();
  });

  it("TC-HC04-04: Header trên thiết bị di động -> background-position: center được bật, background-attachment: scroll trên mobile", () => {
    const headerCss = fs.readFileSync(
      path.resolve(__dirname, "../components/Header/Header.module.css"),
      "utf-8"
    );

    // Xác nhận background-position: center không còn bị comment out
    expect(headerCss).toMatch(/background-position:\s*center/);

    // Xác nhận có background-attachment: scroll
    expect(headerCss).toMatch(/background-attachment:\s*scroll/);

    // Xác nhận header-container có min-width: 0 và box-sizing: border-box
    expect(headerCss).toMatch(/box-sizing:\s*border-box/);
    expect(headerCss).toMatch(/min-width:\s*0/);
  });
});
