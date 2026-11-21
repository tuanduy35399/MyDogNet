import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreatePost from '../page/Admin/manage/Post/CreatePost';
import UpdatePost from '../page/Admin/manage/Post/UpdatePost';
import PostManager from '../page/Admin/manage/Post/PostManager';
import PostPreview from '../page/Admin/manage/Post/PostPreview';
import api from '../api';

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
// Publication state tests isolate the editor; the real Quill editor is exercised in the browser sandbox.
vi.mock('../components/Editor/RichTextEditor', () => ({
  default: ({ value, onChange, onBusyChange }) => <><textarea aria-label="Nội dung" value={value} onChange={e => onChange(e.target.value)} /><button onClick={() => onBusyChange(true)}>Mô phỏng upload</button></>,
  uploadImage: vi.fn(),
}));
const post = { id: 12, title: 'Bài kiểm thử', content: '<p>Nội dung gốc</p>', thumbnail: null, isPublished: true, authorName: 'editorA', viewCount: 7, updatedAt: '2026-11-21T01:00:00Z' };
function edit() { return render(<MemoryRouter initialEntries={['/edit/12']}><Routes><Route path="/edit/:id" element={<UpdatePost />} /></Routes></MemoryRouter>); }
function fillCreate() { fireEvent.change(screen.getByPlaceholderText('Nhập tiêu đề bài viết...'), { target: { value: 'Nháp mới' } }); fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: '<p>Nội dung</p>' } }); }
beforeEach(() => { vi.resetAllMocks(); api.post.mockResolvedValue({ data: { id: 12 } }); api.patch.mockResolvedValue({ data: {} }); vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('HT01: lưu nháp, xuất bản, thu hồi và xem trước', () => {
  it.each([['Lưu nháp', false], ['Xuất bản', true]])('FE-HT01-CREATE: %s gửi đúng trạng thái', async (label, expected) => {
    render(<MemoryRouter><CreatePost /></MemoryRouter>); fillCreate(); fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/post', expect.objectContaining({ title: 'Nháp mới', content: '<p>Nội dung</p>', isPublished: expected }), expect.anything()));
  });
  it('FE-HT01-FAILURE: lưu lỗi giữ nội dung và cho phép thử lại', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 500 } });
    render(<MemoryRouter><CreatePost /></MemoryRouter>); fillCreate(); fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Đăng bài thất bại'); expect(screen.getByLabelText('Nội dung')).toHaveValue('<p>Nội dung</p>');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' })); await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  });
  it('FE-HT01-BUSY: khóa cả hai nút trong lúc ảnh chưa tải xong', () => {
    render(<MemoryRouter><CreatePost /></MemoryRouter>); fillCreate(); fireEvent.click(screen.getByRole('button', { name: 'Mô phỏng upload' }));
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Xuất bản' })).toBeDisabled(); expect(api.post).not.toHaveBeenCalled();
  });
  it.each([[true, 'Lưu thay đổi', true], [true, 'Thu hồi về nháp', false], [false, 'Xuất bản', true], [false, 'Lưu nháp', false]])('FE-HT01-EDIT: trạng thái %s, nút %s', async (published, label, expected) => {
    api.get.mockResolvedValue({ data: { ...post, isPublished: published } }); edit(); fireEvent.click(await screen.findByRole('button', { name: label }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/post/12', expect.arrayContaining([{ path: '/isPublished', op: 'replace', value: expected }]), expect.anything()));
  });
  it('FE-HT01-EDIT-FAILURE: lỗi PATCH không xóa phần đang soạn', async () => {
    api.get.mockResolvedValue({ data: post }); api.patch.mockRejectedValueOnce({ response: { status: 500 } }); edit();
    await screen.findByRole('button', { name: 'Lưu thay đổi' }); fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: '<p>Chưa lưu</p>' } }); fireEvent.click(screen.getByRole('button', { name: 'Thu hồi về nháp' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cập nhật thất bại'); expect(screen.getByLabelText('Nội dung')).toHaveValue('<p>Chưa lưu</p>'); expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
  });
  it('FE-HT01-FILTER: lọc nháp đặt lại trang 1, hiển thị badge và bỏ phản hồi bộ lọc cũ', async () => {
    let resolveOld; api.get.mockResolvedValueOnce({ data: { data: [post], totalPages: 2, totalRecords: 6 } });
    render(<MemoryRouter><PostManager /></MemoryRouter>); await screen.findByText('Bài kiểm thử');
    api.get.mockImplementationOnce(() => new Promise(r => { resolveOld = r; })); fireEvent.click(screen.getByTestId('admin-next-page'));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2)); api.get.mockResolvedValueOnce({ data: { data: [{ ...post, id: 13, title: 'Nháp mới', isPublished: false }], totalPages: 1, totalRecords: 1 } });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'draft' } }); await screen.findByText('Nháp mới');
    expect(api.get).toHaveBeenLastCalledWith('/post/manage', { params: { pageNumber: 1, pageSize: 5, searchTerm: undefined, status: 'draft' } });
    await act(async () => { resolveOld({ data: { data: [{ ...post, title: 'Phản hồi cũ' }], totalPages: 2, totalRecords: 6 } }); });
    expect(screen.queryByText('Phản hồi cũ')).not.toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Xem trước' })).toHaveAttribute('href', '/admin-dashboard-80820508/preview-post-80820508/13');
  });
  it.each([200, 403])('FE-HT01-PREVIEW: HTTP %s không gửi lượt xem', async status => {
    status === 200 ? api.get.mockResolvedValue({ data: { ...post, isPublished: false } }) : api.get.mockRejectedValue({ response: { status } });
    render(<MemoryRouter initialEntries={['/preview/12']}><Routes><Route path="/preview/:id" element={<PostPreview />} /></Routes></MemoryRouter>);
    status === 200 ? expect(await screen.findByText('Bài kiểm thử')).toBeVisible() : expect(await screen.findByRole('alert')).toHaveTextContent('không có quyền');
    expect(api.get).toHaveBeenCalledWith('/post/manage/12', expect.anything()); expect(api.post).not.toHaveBeenCalled();
  });
});
