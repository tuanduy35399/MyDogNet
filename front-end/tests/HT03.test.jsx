import { StrictMode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import PostDetail from '../page/PostDetail/PostDetail';
import api from '../api';
vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../context/UserContext', () => ({ useUser: () => ({ user: null }) }));
vi.mock('../components/Header/Header', () => ({ default: () => <header>DogNet</header> }));
vi.mock('../components/Footer', () => ({ default: () => <footer>DogNet</footer> }));
const article = { id: 12, title: 'Bài công khai', content: '<p>Nội dung vẫn đọc được</p>', viewCount: 7, isPublished: true };
function App() { const nav = useNavigate(); const [, rerender] = useState(0); return <><button onClick={() => nav('/post/12')}>Mở lại</button><button onClick={() => nav('/post/13')}>Bài khác</button><button onClick={() => rerender(n => n + 1)}>Rerender</button><Routes><Route path="/post/:id" element={<PostDetail />} /></Routes></>; }
function open() { return render(<StrictMode><MemoryRouter initialEntries={['/post/12']}><App /></MemoryRouter></StrictMode>); }
beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue({ data: article }); api.post.mockResolvedValue({ data: { viewCount: 8 } }); });

describe('HT03: mỗi lần mở công khai hợp lệ gửi một lượt', () => {
  it('TC-HT03-01/04: StrictMode và rerender không gửi trùng; hiển thị số từ server', async () => {
    open(); expect(await screen.findByTestId('post-content')).toBeVisible(); await waitFor(() => expect(screen.getByTestId('post-view-count')).toHaveTextContent('8'));
    fireEvent.click(screen.getByRole('button', { name: 'Rerender' })); await act(async () => {});
    expect(api.post).toHaveBeenCalledTimes(1); expect(api.post).toHaveBeenCalledWith('/post/12/view', null, { timeout: 15000 });
  });
  it('TC-HT03-04-REOPEN: điều hướng mới cùng bài, kể cả GET trả cùng object, tăng thêm một', async () => {
    open(); await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1)); api.post.mockResolvedValueOnce({ data: { viewCount: 9 } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở lại' })); await waitFor(() => expect(screen.getByTestId('post-view-count')).toHaveTextContent('9')); expect(api.post).toHaveBeenCalledTimes(2);
  });
  it.each([404, 500])('TC-HT03-02: GET %s không gọi POST lượt xem', async status => {
    api.get.mockRejectedValue({ response: { status } }); open(); await screen.findByTestId(status === 404 ? 'not-found-message' : 'error-message'); expect(api.post).not.toHaveBeenCalled();
  });
  it('TC-HT03-05: POST lỗi vẫn đọc được bài, rerender không tự thử lại POST không chắc đã commit', async () => {
    api.post.mockRejectedValue({ code: 'ECONNABORTED' }); open(); expect(await screen.findByRole('status')).toHaveTextContent('Bạn vẫn có thể đọc bài viết'); expect(screen.getByText('Nội dung vẫn đọc được')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rerender' })); await act(async () => {}); expect(api.post).toHaveBeenCalledTimes(1); expect(screen.getByTestId('post-view-count')).toHaveTextContent('7');
  });
  it('FE-HT03-NAVIGATION: GET bị hủy không tính lượt; POST cũ trả chậm không ghi đè số bài mới', async () => {
    let resolveView; api.post.mockImplementationOnce(() => new Promise(r => { resolveView = r; })); open(); await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    api.get.mockResolvedValueOnce({ data: { ...article, id: 13, title: 'Bài mới', viewCount: 50 } }); api.post.mockResolvedValueOnce({ data: { viewCount: 51 } }); fireEvent.click(screen.getByRole('button', { name: 'Bài khác' }));
    await waitFor(() => expect(screen.getByTestId('post-view-count')).toHaveTextContent('51')); await act(async () => { resolveView({ data: { viewCount: 8 } }); });
    expect(screen.getByTestId('post-view-count')).toHaveTextContent('51'); expect(api.post.mock.calls.map(c => c[0])).toEqual(['/post/12/view', '/post/13/view']);
  });
  it('FE-HT03-CANCELLED-GET: chuyển trang trước GET đầu hoàn tất chỉ tính bài được đọc', async () => {
    const pending = []; api.get.mockImplementation(() => new Promise(r => pending.push(r))); open();
    fireEvent.click(screen.getByRole('button', { name: 'Bài khác' })); await act(async () => { pending.at(-1)({ data: { ...article, id: 13 } }); }); await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    await act(async () => { pending.slice(0, -1).forEach(r => r({ data: article })); }); expect(api.post).toHaveBeenCalledTimes(1); expect(api.post).toHaveBeenCalledWith('/post/13/view', null, expect.anything());
  });
});
