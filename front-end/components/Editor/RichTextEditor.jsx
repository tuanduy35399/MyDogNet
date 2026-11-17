import { useEffect, useMemo, useRef, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import axiosClient from '../../api';

export async function uploadImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận JPEG, PNG hoặc WebP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh vượt 5 MiB.');
  const data = new FormData(); data.append('file', file);
  const response = await axiosClient.post('/Upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  return response.data.url;
}
export default function RichTextEditor({ value, onChange, onBusyChange }) {
  const ref = useRef(null);
  const input = useRef(null);
  const anchor = useRef(0);
  const busy = useRef(false);
  const callbacks = useRef({ onChange, onBusyChange });
  callbacks.current = { onChange, onBusyChange };
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const modules = useMemo(() => ({ toolbar: {
    container: [[{ header: [1, 2, 3, false] }], ['bold','italic','underline','strike'], [{list:'ordered'},{list:'bullet'}], [{color:[]},{background:[]}], ['link','image','video'], ['clean','code-block']],
    handlers: { image() { anchor.current = this.quill.getSelection(true)?.index ?? this.quill.getLength()-1; input.current.click(); } },
  } }), []);
  useEffect(() => {
    const editor = ref.current.getEditor();
    const root = editor.root;
    async function insert(files, html = null, index = null) {
      if (busy.current) return;
      setError('');
      const current = root.querySelectorAll('img').length;
      const htmlDoc = html ? new DOMParser().parseFromString(html, 'text/html') : null;
      const dataImages = htmlDoc ? [...htmlDoc.querySelectorAll('img')].filter(i => i.src.startsWith('data:')) : [];
      if (current + (htmlDoc ? htmlDoc.querySelectorAll('img').length : files.length) > 20) { setError('Một bài tối đa 20 ảnh.'); return; }
      busy.current = true; setLoading(true); callbacks.current.onBusyChange?.(true);
      const position = index ?? editor.getSelection(true)?.index ?? editor.getLength()-1;
      editor.enable(false);
      try {
        if (htmlDoc) {
          for (const img of dataImages) {
            if (img.src.length > 7 * 1024 * 1024) throw new Error('Ảnh vượt 5 MiB.');
            const blob = await (await fetch(img.src)).blob();
            img.src = await uploadImage(new File([blob], 'pasted-image', { type: blob.type }));
          }
          editor.clipboard.dangerouslyPasteHTML(position, htmlDoc.body.innerHTML, 'api');
        } else {
          let offset = 0;
          for (const file of files) {
            const url = await uploadImage(file);
            editor.insertEmbed(position + offset++, 'image', url, 'api');
          }
          editor.setSelection(position + offset, 0, 'silent');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Upload thất bại. Hãy thử lại ảnh.');
      } finally {
        editor.enable(true); busy.current = false; setLoading(false); callbacks.current.onBusyChange?.(false);
      }
    }
    async function intercept(event) {
      const transfer = event.clipboardData || event.dataTransfer;
      const files = [...(transfer?.files || [])];
      const html = transfer?.getData('text/html');
      const hasDataImage = html && [...new DOMParser().parseFromString(html,'text/html').querySelectorAll('img')].some(i => i.src.startsWith('data:'));
      if (!files.length && !hasDataImage) return;
      event.preventDefault(); event.stopImmediatePropagation();
      await insert(files, hasDataImage ? html : null);
    }
    const paste = e => { void intercept(e); };
    const drop = e => { void intercept(e); };
    const drag = e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); };
    const pick = e => { const files = [...e.target.files]; e.target.value = ''; void insert(files, null, anchor.current); };
    const picker = input.current;
    root.addEventListener('paste', paste, true); root.addEventListener('drop', drop, true); root.addEventListener('dragover', drag);
    picker.addEventListener('change', pick);
    return () => { root.removeEventListener('paste', paste, true); root.removeEventListener('drop', drop, true); root.removeEventListener('dragover', drag); picker.removeEventListener('change', pick); };
  }, []);
  return <div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden aria-label="Chọn ảnh nội dung" />
    {loading && <p role="status">Đang tải ảnh, vui lòng đợi trước khi lưu bài…</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
    <ReactQuill ref={ref} theme="snow" value={value} onChange={onChange} modules={modules} />
  </div>;
}
