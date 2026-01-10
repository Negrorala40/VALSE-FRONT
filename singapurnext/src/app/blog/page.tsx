'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BlogContent from '@/app/components/BlogContent/BlogContent';
import styles from './BlogListPage.module.css';

interface BlogPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  featuredImageUrl?: string;
  publicationDate: string;
  tags: string;
  authorName: string;
  published: boolean;
  slug: string;
  viewCount: number;
  commentCount: number;
  images?: any[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function BlogListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const size = 9; // Posts por página

  useEffect(() => {
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    
    if (tag) setSelectedTag(tag);
    if (search) setSearchTerm(search);
    
    fetchPosts();
    fetchTags();
  }, [page, searchParams]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `${API_URL}/api/blog?page=${page}&size=${size}&sort=publicationDate,desc`;
      
      const tag = searchParams.get('tag');
      const search = searchParams.get('search');
      
      if (tag) {
        url = `${API_URL}/api/blog/tag/${tag}?page=${page}&size=${size}`;
      } else if (search) {
        url = `${API_URL}/api/blog/search?q=${encodeURIComponent(search)}&page=${page}&size=${size}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar posts');
      }
      
      const data = await response.json();
      
      // Manejar tanto Page como List
      if (data.content) {
        setPosts(data.content);
        setTotalPages(data.totalPages);
      } else {
        setPosts(data);
        setTotalPages(1);
      }
      
    } catch (err: any) {
      setError(err.message || 'Error al cargar posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_URL}/api/blog/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/blog?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      router.push('/blog');
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    router.push(`/blog?tag=${encodeURIComponent(tag)}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostClick = (postId: number) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      router.push(`/blog/${post.slug}`);
    }
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSearchTerm('');
    setPage(0);
    router.push('/blog');
  };

  // Extraer todas las tags únicas de los posts
  const allTags = Array.from(
    new Set(
      posts
        .flatMap(post => post.tags?.split(',').map(t => t.trim()).filter(t => t) || [])
        .filter(Boolean)
    )
  ).slice(0, 15); // Limitar a 15 tags

  if (loading && page === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Cargando blog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Nuestro Blog</h1>
          <p className={styles.heroSubtitle}>
            Descubre artículos, noticias y consejos sobre moda, estilo de vida y tendencias.
          </p>
        </div>
        
        {/* Búsqueda */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar artículos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              <i className="fas fa-search"></i>
            </button>
          </div>
        </form>
      </header>

      {/* Filtros */}
      <div className={styles.filters}>
        <div className={styles.tagsContainer}>
          <h3><i className="fas fa-tags"></i> Categorías</h3>
          <div className={styles.tags}>
            <button
              onClick={clearFilters}
              className={`${styles.tag} ${!selectedTag ? styles.active : ''}`}
            >
              Todos
            </button>
            {allTags.map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagClick(tag)}
                className={`${styles.tag} ${selectedTag === tag ? styles.active : ''}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        {selectedTag && (
          <div className={styles.selectedFilter}>
            <span>Filtrado por: <strong>{selectedTag}</strong></span>
            <button onClick={clearFilters} className={styles.clearFilter}>
              <i className="fas fa-times"></i> Limpiar filtro
            </button>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className={styles.error}>
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
          <button onClick={fetchPosts} className={styles.retryBtn}>
            Reintentar
          </button>
        </div>
      )}

      {/* Posts */}
      <main className={styles.main}>
        <BlogContent
          posts={posts}
          isAdmin={false}
          onPostClick={handlePostClick}
        />
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              className={styles.pageButton}
            >
              <i className="fas fa-chevron-left"></i> Anterior
            </button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i;
                if (totalPages > 5) {
                  if (page > 2) pageNum = page - 2 + i;
                  if (page > totalPages - 3) pageNum = totalPages - 5 + i;
                }
                if (pageNum >= 0 && pageNum < totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`${styles.pageNumber} ${page === pageNum ? styles.active : ''}`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                }
                return null;
              }).filter(Boolean)}
            </div>
            
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className={styles.pageButton}
            >
              Siguiente <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </main>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarSection}>
          <h3><i className="fas fa-fire"></i> Artículos populares</h3>
          <div className={styles.popularPosts}>
            {posts
              .sort((a, b) => b.viewCount - a.viewCount)
              .slice(0, 5)
              .map((post) => (
                <a
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className={styles.popularPost}
                >
                  <span className={styles.popularTitle}>{post.title}</span>
                  <span className={styles.popularViews}>
                    <i className="fas fa-eye"></i> {post.viewCount}
                  </span>
                </a>
              ))}
          </div>
        </div>
        
        <div className={styles.sidebarSection}>
          <h3><i className="fas fa-tags"></i> Todas las etiquetas</h3>
          <div className={styles.allTags}>
            {tags.slice(0, 20).map((tag, index) => (
              <a
                key={index}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className={styles.allTag}
              >
                {tag}
              </a>
            ))}
          </div>
        </div>
        
        <div className={styles.sidebarSection}>
          <h3><i className="fas fa-info-circle"></i> Sobre nuestro blog</h3>
          <div className={styles.about}>
            <p>
              Compartimos las últimas tendencias de moda, consejos de estilo 
              y novedades del mundo fashion. Inspírate y descubre tu estilo único.
            </p>
            <a href="/about" className={styles.aboutLink}>
              Conoce más sobre nosotros <i className="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}