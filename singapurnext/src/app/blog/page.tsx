'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BlogContent from '@/app/components/BlogContent/BlogContent';
import styles from './BlogListPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function BlogListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, [page, searchParams]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const tag = searchParams.get('tag');
      const search = searchParams.get('search');
      
      let url = `${API_URL}/api/blog?page=${page}&size=12&sort=publicationDate,desc`;
      
      if (tag) {
        url = `${API_URL}/api/blog/tag/${encodeURIComponent(tag)}?page=${page}&size=12`;
      } else if (search) {
        url = `${API_URL}/api/blog/search?q=${encodeURIComponent(search)}&page=${page}&size=12`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudieron cargar los posts`);
      }
      
      const data = await response.json();
      
      if (data.content) {
        setPosts(data.content);
        setTotalPages(data.totalPages || 1);
      } else {
        setPosts(data || []);
        setTotalPages(1);
      }
      
    } catch (err: any) {
      setError(err.message || 'Error al cargar los posts');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (postId: number) => {
    const post = posts.find(p => p.id === postId);
    if (post?.slug) {
      router.push(`/blog/${post.slug}`);
    } else {
      router.push(`/blog/${postId}`);
    }
  };

  if (loading && page === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando blog...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Tu contenido actual */}
      
      {error && (
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button onClick={fetchPosts}>Reintentar</button>
        </div>
      )}

      <BlogContent
        posts={posts}
        isAdmin={false}
        onPostClick={handlePostClick}
      />
      
      {/* Tu paginación */}
    </div>
  );
}