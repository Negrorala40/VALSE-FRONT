'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link'; // Importar al inicio
import BlogContent from '@/app/components/BlogContent/BlogContent';
import styles from './BlogListPage.module.css';

// TIPOS compatibles con el backend
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
  images?: Array<{
    id?: number;
    imageUrl: string;
    altText?: string;
    caption?: string;
    displayOrder?: number;
    isFeatured?: boolean;
  }>;
}

// Tipo para la respuesta paginada de la API
interface ApiResponse {
  content: BlogPost[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function BlogListPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const size = 12;

  useEffect(() => {
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    
    // Solo actualizar si hay cambios reales
    if (tag !== selectedTag) {
      setSelectedTag(tag);
    }
    if (search !== searchTerm) {
      setSearchTerm(search || '');
    }
    
    fetchPosts();
  }, [page, searchParams]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `${API_URL}/api/blog?page=${page}&size=${size}&sort=publicationDate,desc`;
      
      const tag = searchParams.get('tag');
      const search = searchParams.get('search');
      
      if (tag) {
        url = `${API_URL}/api/blog/tag/${encodeURIComponent(tag)}?page=${page}&size=${size}`;
      } else if (search) {
        url = `${API_URL}/api/blog/search?q=${encodeURIComponent(search)}&page=${page}&size=${size}`;
      }
      
      const response = await fetch(url, {
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText || 'No se pudieron cargar los posts'}`);
      }
      
      const data: ApiResponse | BlogPost[] = await response.json();
      
      // Manejar tanto Page como List
      if (Array.isArray(data)) {
        // Si es un array simple
        setPosts(data);
        setTotalPages(1);
      } else if ('content' in data) {
        // Si es una respuesta paginada
        setPosts(data.content);
        setTotalPages(data.totalPages || 1);
      } else {
        // Si es un solo objeto (puede pasar)
        setPosts([data as BlogPost]);
        setTotalPages(1);
      }
      
    } catch (err: any) {
      setError(err.message || 'Error al cargar los posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (postId: number) => {
    const post = posts.find(p => p.id === postId);
    if (post?.slug) {
      router.push(`/blog/${post.slug}`);
    } else if (post?.id) {
      router.push(`/blog/${post.id}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/blog?search=${encodeURIComponent(searchTerm.trim())}`);
      setPage(0);
      setSelectedTag(null);
    } else {
      router.push('/blog');
      setSelectedTag(null);
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    setSearchTerm('');
    router.push(`/blog?tag=${encodeURIComponent(tag)}`);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSearchTerm('');
    setPage(0);
    router.push('/blog');
  };

  // Extraer tags únicas de los posts
  const allTags = Array.from(
    new Set(
      posts
        .flatMap(post => post.tags?.split(',').map(t => t.trim()).filter(t => t) || [])
        .filter(Boolean)
    )
  ).slice(0, 15);

  if (loading && page === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
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
              .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
              .slice(0, 5)
              .map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug || post.id}`}
                  className={styles.popularPost}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePostClick(post.id);
                  }}
                >
                  <span className={styles.popularTitle}>{post.title}</span>
                  <span className={styles.popularViews}>
                    <i className="fas fa-eye"></i> {post.viewCount || 0}
                  </span>
                </Link>
              ))}
          </div>
        </div>
        
        <div className={styles.sidebarSection}>
          <h3><i className="fas fa-tags"></i> Todas las etiquetas</h3>
          <div className={styles.allTags}>
            {allTags.slice(0, 20).map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagClick(tag)}
                className={styles.allTag}
              >
                {tag}
              </button>
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
            <Link href="/about" className={styles.aboutLink}>
              Conoce más sobre nosotros <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}