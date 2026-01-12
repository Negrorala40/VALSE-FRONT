'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './BlogPreview.module.css';

// Tipo simplificado para la vista previa
interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  featuredImageUrl?: string;
  publicationDate: string;
  tags: string;
  slug: string;
  authorName: string;
}

export default function BlogPreview() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/blog?page=0&size=3&sort=publicationDate,desc&published=true`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar los posts');
        }
        
        const data = await response.json();
        
        // Manejar diferentes formatos de respuesta de la API
        let postsData: BlogPost[] = [];
        if (Array.isArray(data)) {
          postsData = data;
        } else if (data.content && Array.isArray(data.content)) {
          postsData = data.content;
        } else if (data) {
          postsData = [data];
        }
        
        setPosts(postsData.slice(0, 3)); // Máximo 3 posts para homepage
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const getImageUrl = (post: BlogPost): string => {
    // Si hay imagen destacada, úsala
    if (post.featuredImageUrl && post.featuredImageUrl.trim() !== '') {
      return post.featuredImageUrl;
    }
    // Imagen por defecto
    return '/images/blog-placeholder.jpg';
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Cargando últimas publicaciones...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.section}>
        <div className={styles.errorContainer}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>No se pudieron cargar las publicaciones</p>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null; // No mostrar nada si no hay posts
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>
          <i className="fas fa-newspaper"></i> Últimas Publicaciones
        </h2>
        <Link href="/blog" className={styles.viewAll}>
          Ver todos los artículos <i className="fas fa-arrow-right"></i>
        </Link>
      </div>
      
      <div className={styles.grid}>
        {posts.map((post) => (
          <article key={post.id} className={styles.card}>
            <Link href={`/blog/${post.slug || post.id}`} className={styles.cardLink}>
              <div className={styles.imageContainer}>
                <Image
                  src={getImageUrl(post)}
                  alt={post.title}
                  width={400}
                  height={250}
                  className={styles.image}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = '/images/blog-placeholder.jpg';
                  }}
                />
                <div className={styles.dateBadge}>
                  <i className="fas fa-calendar"></i> {formatDate(post.publicationDate)}
                </div>
              </div>
              
              <div className={styles.content}>
                <h3 className={styles.title}>{post.title}</h3>
                {post.excerpt && (
                  <p className={styles.excerpt}>
                    {post.excerpt.length > 100 
                      ? `${post.excerpt.substring(0, 100)}...` 
                      : post.excerpt}
                  </p>
                )}
                <div className={styles.meta}>
                  <span className={styles.author}>
                    <i className="fas fa-user"></i> {post.authorName || 'Admin'}
                  </span>
                </div>
              </div>
              
              <div className={styles.readMore}>
                Leer más <i className="fas fa-arrow-right"></i>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}