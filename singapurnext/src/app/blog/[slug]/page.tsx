'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BlogComments from '@/app/components/BlogComments/BlogComments';
import styles from './BlogDetail.module.css';

// TIPOS
interface BlogImage {
  id?: number;
  imageUrl: string;
  altText?: string;
  caption?: string;
  displayOrder?: number;
  isFeatured?: boolean;
}

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
  images?: BlogImage[];
}

interface Comment {
  id: number;
  userName: string;
  userEmail: string;
  content: string;
  createdAt: string;
  approved: boolean;
  blogPostId: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface BlogDetailProps {
  slug: string;
}

export default function BlogDetail({ slug }: BlogDetailProps) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBlogPost();
  }, [slug]);

  const fetchBlogPost = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_URL}/api/blog/slug/${slug}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/404');
          return;
        }
        throw new Error(`Error ${response.status}`);
      }
      
      const data = await response.json();
      setPost(data);
      fetchComments(data.id);
    } catch (err: any) {
      setError('No se pudo cargar el artículo. Intenta nuevamente.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/blog/${postId}/comments?page=0&size=50`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.content || data || []);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const handleCommentAdded = () => {
    if (post) {
      fetchComments(post.id);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const getFeaturedImage = () => {
    if (!post) return null;
    
    if (post.featuredImageUrl) return post.featuredImageUrl;
    
    if (post.images && post.images.length > 0) {
      const featured = post.images.find(img => img.isFeatured);
      if (featured?.imageUrl) return featured.imageUrl;
      if (post.images[0]?.imageUrl) return post.images[0].imageUrl;
    }
    
    return null;
  };

  const extractTags = () => {
    if (!post?.tags) return [];
    return post.tags.split(',').map(t => t.trim()).filter(t => t);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Cargando artículo...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.error}>
        <h2>❌ Error</h2>
        <p>{error || 'Artículo no encontrado'}</p>
        <Link href="/blog" className={styles.backButton}>
          ← Volver al blog
        </Link>
      </div>
    );
  }

  const featuredImage = getFeaturedImage();
  const tags = extractTags();
  const formattedDate = formatDate(post.publicationDate);

  return (
    <article className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/">Inicio</Link>
        <span> › </span>
        <Link href="/blog">Blog</Link>
        <span> › </span>
        <span>{post.title}</span>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.map((tag, index) => (
              <Link 
                key={index} 
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className={styles.tag}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
        
        <h1 className={styles.title}>{post.title}</h1>
        
        <div className={styles.meta}>
          <span className={styles.author}>
            <i className="fas fa-user"></i> Por {post.authorName || 'Admin'}
          </span>
          <span className={styles.date}>
            <i className="fas fa-calendar"></i> {formattedDate}
          </span>
          <span className={styles.views}>
            <i className="fas fa-eye"></i> {post.viewCount} vistas
          </span>
          <span className={styles.comments}>
            <i className="fas fa-comment"></i> {post.commentCount} comentarios
          </span>
        </div>
      </header>

      {/* Featured Image */}
      {featuredImage && (
        <div className={styles.featuredImage}>
          <img 
            src={featuredImage} 
            alt={post.title}
            className={styles.image}
            onError={(e) => {
              e.currentTarget.src = '/images/blog-placeholder.jpg';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        <div 
          className={styles.postContent}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* Share Section */}
      <div className={styles.share}>
        <span>Compartir:</span>
        <div className={styles.shareButtons}>
          <button 
            onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')}
            className={`${styles.shareButton} ${styles.facebook}`}
          >
            <i className="fab fa-facebook-f"></i>
          </button>
          <button 
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${post.title}&url=${window.location.href}`, '_blank')}
            className={`${styles.shareButton} ${styles.twitter}`}
          >
            <i className="fab fa-twitter"></i>
          </button>
          <button 
            onClick={() => window.open(`https://wa.me/?text=${post.title} ${window.location.href}`, '_blank')}
            className={`${styles.shareButton} ${styles.whatsapp}`}
          >
            <i className="fab fa-whatsapp"></i>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <div className={styles.commentsSection}>
        <BlogComments
          postId={post.id}
          comments={comments}
          onCommentAdded={handleCommentAdded}
        />
      </div>

      {/* Related Posts */}
      {tags.length > 0 && (
        <div className={styles.relatedPosts}>
          <h3>Artículos relacionados</h3>
          <p>Más sobre: {tags.slice(0, 3).join(', ')}</p>
          <Link 
            href={`/blog?tag=${encodeURIComponent(tags[0])}`}
            className={styles.seeAll}
          >
            Ver todos los artículos sobre {tags[0]} →
          </Link>
        </div>
      )}

      {/* Back to Blog */}
      <div className={styles.backToBlog}>
        <Link href="/blog" className={styles.backButton}>
          <i className="fas fa-arrow-left"></i> Volver al blog
        </Link>
      </div>
    </article>
  );
}