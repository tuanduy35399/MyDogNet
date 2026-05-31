import { kv } from '@vercel/kv';

export async function handler(request, response) {
  try {
    // Tự động tăng key 'total_views' lên 1 trong Vercel KV
    const views = await kv.incr('total_views');
    
    // Trả số lượng về cho React Front-end
    return response.status(200).json({ views });
  } catch (error) {
    return response.status(500).json({ views: 0, error: error.message });
  }
}