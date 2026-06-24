'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface SharedNote {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [note, setNote] = useState<SharedNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNote() {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || '获取分享内容失败');
        } else {
          setNote(data.note);
        }
      } catch {
        setError('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    }
    
    if (token) {
      fetchNote();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">无法访问</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">未找到分享内容</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6 pb-4 border-b">
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full mb-3">
              {note.category}
            </span>
            <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
            <p className="text-sm text-gray-500 mt-2">
              分享于 {new Date(note.created_at).toLocaleDateString('zh-CN')}
            </p>
          </div>
          
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
          
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-gray-500 text-sm">
              由 Secure Vault 分享
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
