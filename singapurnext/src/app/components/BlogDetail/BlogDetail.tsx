'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BlogComments from '@/app/components/BlogComments/BlogComments';
import { BLOG_POST_BY_SLUG } from '@/app/utils/Api'; // Importa la constante
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
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Comment {
  id: number;
  userName: string;
  userEmail: string;
  content: string;
  createdAt: string;
  approved: boolean;
  blogPostId: number;
  blogPostTitle?: string;
}

interface BlogDetailProps {
  slug: string;
  postId?: number;
}

export default function BlogDetail({ slug, postId }: BlogDetailProps) {
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState('');
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (slug || postId) {
      fetchBlogPost();
    }
  }, [slug, postId]);

  useEffect(() => {
    if (post?.id && post?.tags) {
      fetchRelatedPosts();
      fetchComments();
    }
  }, [post?.id, post?.tags]);

  const fetchBlogPost = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = '';
      if (slug) {
        url = BLOG_POST_BY_SLUG(slug); // Usa la constante
      } else if (postId) {
        url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/blog/${postId}`;
      } else {
        throw new Error('Se requiere ID o slug del post');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Si quieres usar Cache-Control, asegúrate que el backend lo permita
          // 'Cache-Control': 'no-cache' // COMENTA ESTA LÍNEA TEMPORALMENTE
        },
        // Opcional: usa cache del navegador
        cache: 'default'
      });

      if (!response.ok) {
        if (response.status === 404) {
          setError('El artículo que buscas no existe o ha sido eliminado.');
          return;
        }
        throw new Error(`Error ${response.status}: No se pudo cargar el artículo`);
      }

      const data = await response.json();
      const formattedPost = formatPostFromAPI(data);
      setPost(formattedPost);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el artículo. Por favor, intenta nuevamente.');
      console.error('Error fetching blog post:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!post?.id) return;

    try {
      setLoadingComments(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/blog/${post.id}/comments?page=0&size=50&sort=createdAt,desc`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const commentsData = data.content || data || [];
        setComments(commentsData.map(formatCommentFromAPI));
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchRelatedPosts = async () => {
    if (!post?.tags || !post.id) return;

    try {
      const tags = extractTags(post.tags);
      if (tags.length === 0) return;

      // Tomar la primera etiqueta para buscar posts relacionados
      const mainTag = tags[0];
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/blog/tag/${encodeURIComponent(mainTag)}?page=0&size=4&sort=publicationDate,desc`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const postsData = data.content || data || [];
        // Filtrar el post actual
        const related = postsData
          .filter((p: any) => p.id !== post.id)
          .slice(0, 3)
          .map(formatPostFromAPI);
        setRelatedPosts(related);
      }
    } catch (err) {
      console.error('Error fetching related posts:', err);
    }
  };

  const formatPostFromAPI = (postData: any): BlogPost => ({
    id: postData.id || 0,
    title: postData.title || 'Sin título',
    content: postData.content || '',
    excerpt: postData.excerpt || '',
    featuredImageUrl: postData.featuredImageUrl || '',
    publicationDate: postData.publicationDate || new Date().toISOString(),
    tags: postData.tags || '',
    authorName: postData.authorName || 'Admin',
    published: postData.published !== false,
    slug: postData.slug || postData.id?.toString() || '',
    viewCount: postData.viewCount || 0,
    commentCount: postData.commentCount || 0,
    metaTitle: postData.metaTitle || '',
    metaDescription: postData.metaDescription || '',
    createdAt: postData.createdAt || '',
    updatedAt: postData.updatedAt || '',
    images: postData.images?.map((img: any) => ({
      id: img.id,
      imageUrl: img.imageUrl || '',
      altText: img.altText || '',
      caption: img.caption || '',
      displayOrder: img.displayOrder || 0,
      isFeatured: img.isFeatured || false
    })) || []
  });

  const formatCommentFromAPI = (commentData: any): Comment => ({
    id: commentData.id || 0,
    userName: commentData.userName || 'Anónimo',
    userEmail: commentData.userEmail || '',
    content: commentData.content || '',
    createdAt: commentData.createdAt || new Date().toISOString(),
    approved: commentData.approved !== false,
    blogPostId: commentData.blogPostId || 0,
    blogPostTitle: commentData.blogPostTitle || ''
  });

  const getFeaturedImage = (): string => {
    if (!post) return '/images/blog-placeholder.jpg';
    
    if (post.featuredImageUrl && post.featuredImageUrl.trim() !== '') {
      return post.featuredImageUrl;
    }
    
    if (post.images && post.images.length > 0) {
      const featuredImage = post.images.find(img => img.isFeatured);
      if (featuredImage?.imageUrl?.trim()) {
        return featuredImage.imageUrl;
      }
      
      const firstImage = post.images[0];
      if (firstImage?.imageUrl?.trim()) {
        return firstImage.imageUrl;
      }
    }
    
    return '/images/blog-placeholder.jpg';
  };

  const extractTags = (tagsString: string): string[] => {
    if (!tagsString || tagsString.trim() === '') return [];
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha no disponible';
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const handleCommentAdded = () => {
    fetchComments();
    if (post) {
      // Actualizar contador de comentarios localmente
      setPost({
        ...post,
        commentCount: (post.commentCount || 0) + 1
      });
    }
  };

  const handleShare = (platform: string) => {
    if (!post) return;
    
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post.title);
    const text = encodeURIComponent(post.excerpt || post.title);
    
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}&summary=${text}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${url}&description=${title}`,
      telegram: `https://t.me/share/url?url=${url}&text=${title}`
    };
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        alert('✅ Enlace copiado al portapapeles');
      })
      .catch(err => {
        console.error('Error al copiar:', err);
        alert('❌ Error al copiar el enlace');
      });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando artículo...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2>Artículo no disponible</h2>
        <p className={styles.errorMessage}>{error || 'El artículo que buscas no existe o ha sido eliminado.'}</p>
        <div className={styles.errorActions}>
          <Link href="/blog" className={styles.backButton}>
            <i className="fas fa-arrow-left"></i> Volver al blog
          </Link>
          <button 
            onClick={fetchBlogPost} 
            className={styles.retryButton}
          >
            <i className="fas fa-redo"></i> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const featuredImage = getFeaturedImage();
  const tags = extractTags(post.tags);
  const postDate = formatDate(post.publicationDate);
  const updatedDate = post.updatedAt && post.updatedAt !== post.publicationDate 
    ? formatDate(post.updatedAt) 
    : null;
  const isUpdated = updatedDate && updatedDate !== postDate;

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/" className={styles.breadcrumbLink}>Inicio</Link>
        <span className={styles.breadcrumbSeparator}> › </span>
        <Link href="/blog" className={styles.breadcrumbLink}>Blog</Link>
        <span className={styles.breadcrumbSeparator}> › </span>
        <span className={styles.breadcrumbCurrent}>{post.title}</span>
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
                title={`Ver más artículos sobre ${tag}`}
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
        
        <h1 className={styles.title}>{post.title}</h1>
        
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <i className="fas fa-user"></i>
            <span className={styles.metaLabel}>Autor:</span>
            <span className={styles.metaValue}>{post.authorName || 'Admin'}</span>
          </div>
          
          <div className={styles.metaItem}>
            <i className="fas fa-calendar"></i>
            <span className={styles.metaLabel}>Publicado:</span>
            <span className={styles.metaValue}>{postDate}</span>
          </div>
          
          {isUpdated && (
            <div className={styles.metaItem}>
              <i className="fas fa-edit"></i>
              <span className={styles.metaLabel}>Actualizado:</span>
              <span className={styles.metaValue}>{updatedDate}</span>
            </div>
          )}
          
          <div className={styles.metaItem}>
            <i className="fas fa-eye"></i>
            <span className={styles.metaLabel}>Vistas:</span>
            <span className={styles.metaValue}>{post.viewCount || 0}</span>
          </div>
          
          <div className={styles.metaItem}>
            <i className="fas fa-comment"></i>
            <span className={styles.metaLabel}>Comentarios:</span>
            <span className={styles.metaValue}>{post.commentCount || 0}</span>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      {featuredImage && (
        <div className={styles.featuredImage}>
          <img 
            src={featuredImage} 
            alt={post.title}
            className={styles.mainImage}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/images/blog-placeholder.jpg';
              e.currentTarget.classList.add(styles.placeholderImage);
            }}
          />
          {post.images?.[0]?.caption && (
            <figcaption className={styles.imageCaption}>
              {post.images[0].caption}
            </figcaption>
          )}
        </div>
      )}

      {/* Galería de imágenes adicionales */}
      {post.images && post.images.length > 1 && (
        <div className={styles.gallery}>
          <h3 className={styles.galleryTitle}>Galería de imágenes</h3>
          <div className={styles.galleryGrid}>
            {post.images
              .filter((img, index) => index > 0) // Excluir la primera (ya mostrada)
              .map((image, index) => (
                <div key={index} className={styles.galleryItem}>
                  <img 
                    src={image.imageUrl} 
                    alt={image.altText || `Imagen ${index + 2} del artículo`}
                    className={styles.galleryImage}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = '/images/blog-placeholder.jpg';
                    }}
                  />
                  {image.caption && (
                    <p className={styles.galleryCaption}>{image.caption}</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className={styles.content}>
        {post.excerpt && (
          <div className={styles.excerpt}>
            <p>{post.excerpt}</p>
          </div>
        )}
        
        <div 
          className={styles.postContent}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>

      {/* Compartir */}
      <div className={styles.shareSection}>
        <h3 className={styles.shareTitle}>
          <i className="fas fa-share-alt"></i> Compartir este artículo
        </h3>
        <div className={styles.shareButtons}>
          <button 
            className={`${styles.shareButton} ${styles.facebook}`}
            onClick={() => handleShare('facebook')}
            title="Compartir en Facebook"
          >
            <i className="fab fa-facebook-f"></i>
            <span>Facebook</span>
          </button>
          
          <button 
            className={`${styles.shareButton} ${styles.twitter}`}
            onClick={() => handleShare('twitter')}
            title="Compartir en Twitter"
          >
            <i className="fab fa-twitter"></i>
            <span>Twitter</span>
          </button>
          
          <button 
            className={`${styles.shareButton} ${styles.whatsapp}`}
            onClick={() => handleShare('whatsapp')}
            title="Compartir en WhatsApp"
          >
            <i className="fab fa-whatsapp"></i>
            <span>WhatsApp</span>
          </button>
          
          <button 
            className={`${styles.shareButton} ${styles.linkedin}`}
            onClick={() => handleShare('linkedin')}
            title="Compartir en LinkedIn"
          >
            <i className="fab fa-linkedin-in"></i>
            <span>LinkedIn</span>
          </button>
          
          <button 
            className={`${styles.shareButton} ${styles.copy}`}
            onClick={handleCopyLink}
            title="Copiar enlace"
          >
            <i className="fas fa-link"></i>
            <span>Copiar</span>
          </button>
        </div>
      </div>

      {/* Comentarios */}
      <section id="comments" className={styles.commentsSection}>
        <BlogComments
          postId={post.id}
          comments={comments}
          onCommentAdded={handleCommentAdded}
        />
      </section>

      {/* Posts relacionados */}
      {relatedPosts.length > 0 && (
        <div className={styles.relatedPosts}>
          <h3 className={styles.relatedTitle}>
            <i className="fas fa-newspaper"></i> Artículos relacionados
          </h3>
          <div className={styles.relatedGrid}>
            {relatedPosts.map((relatedPost) => (
              <Link 
                key={relatedPost.id} 
                href={`/blog/${relatedPost.slug}`}
                className={styles.relatedCard}
              >
                {relatedPost.featuredImageUrl && (
                  <img 
                    src={relatedPost.featuredImageUrl} 
                    alt={relatedPost.title}
                    className={styles.relatedImage}
                    onError={(e) => {
                      e.currentTarget.src = '/images/blog-placeholder.jpg';
                    }}
                  />
                )}
                <div className={styles.relatedContent}>
                  <h4 className={styles.relatedPostTitle}>{relatedPost.title}</h4>
                  <p className={styles.relatedExcerpt}>
                    {relatedPost.excerpt || 
                    (relatedPost.content 
                        ? `${relatedPost.content.substring(0, 100).replace(/<[^>]*>/g, '')}...`
                        : 'Sin contenido disponible')}
                    </p>
                  <div className={styles.relatedMeta}>
                    <span className={styles.relatedDate}>
                      {formatDate(relatedPost.publicationDate)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Navegación */}
      <div className={styles.navigation}>
        <Link href="/blog" className={styles.backToBlog}>
          <i className="fas fa-arrow-left"></i> Volver al blog
        </Link>
        
        {tags.length > 0 && (
          <Link 
            href={`/blog?tag=${encodeURIComponent(tags[0])}`}
            className={styles.viewMore}
          >
            Ver más sobre {tags[0]} <i className="fas fa-arrow-right"></i>
          </Link>
        )}
      </div>
    </div>
  );
}