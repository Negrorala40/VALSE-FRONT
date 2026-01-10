'use client';

import Link from 'next/link';
import styles from './BlogContent.module.css';

// TIPOS COMPATIBLES con AdminBlogPage
interface BlogImage {
  id?: number; // Cambiado a opcional para coincidir
  imageUrl: string;
  altText?: string;
  caption?: string;
  displayOrder?: number; // Cambiado a opcional
  isFeatured?: boolean; // Cambiado a opcional
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
  images?: BlogImage[]; // Mantener opcional para compatibilidad
}

interface BlogContentProps {
  posts: BlogPost[];
  isAdmin?: boolean;
  onEdit?: (post: BlogPost) => void;
  onDelete?: (id: number) => void;
  onPostClick?: (postId: number) => void;
}

export default function BlogContent({ 
  posts, 
  isAdmin = false, 
  onEdit, 
  onDelete,
  onPostClick 
}: BlogContentProps) {
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Función para obtener la imagen principal
  const getFeaturedImage = (post: BlogPost) => {
    // 1. Usar featuredImageUrl si existe
    if (post.featuredImageUrl) return post.featuredImageUrl;
    
    // 2. Buscar en images
    if (post.images && post.images.length > 0) {
      // Buscar imagen destacada
      const featuredImage = post.images.find(img => img.isFeatured);
      if (featuredImage && featuredImage.imageUrl) return featuredImage.imageUrl;
      
      // O usar la primera imagen
      const firstImage = post.images[0];
      if (firstImage && firstImage.imageUrl) return firstImage.imageUrl;
    }
    
    // 3. Imagen por defecto
    return null;
  };

  // Función para extraer tags
  const extractTags = (tags: string) => {
    if (!tags || tags.trim() === '') return [];
    return tags.split(',').filter(tag => tag.trim() !== '').slice(0, 3);
  };

  return (
    <div className={styles.container}>
      {isAdmin && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.number}>{posts.length}</span>
            <span className={styles.label}>Posts</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.number}>
              {posts.reduce((acc, post) => acc + (post.commentCount || 0), 0)}
            </span>
            <span className={styles.label}>Comentarios</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.number}>
              {posts.reduce((acc, post) => acc + (post.viewCount || 0), 0)}
            </span>
            <span className={styles.label}>Vistas</span>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {posts.map((post) => {
          const featuredImage = getFeaturedImage(post);
          const tags = extractTags(post.tags);
          
          return (
            <div key={post.id} className={styles.card}>
              {featuredImage && (
                <div className={styles.imageContainer}>
                  <img 
                    src={featuredImage} 
                    alt={post.title}
                    className={styles.image}
                    onError={(e) => {
                      e.currentTarget.src = '/images/blog-placeholder.jpg';
                      e.currentTarget.className = styles.placeholderImage;
                    }}
                  />
                  <div className={styles.date}>
                    {formatDate(post.publicationDate)}
                  </div>
                </div>
              )}
              
              {!featuredImage && (
                <div className={styles.noImage}>
                  <i className="fas fa-image"></i>
                  <div className={styles.date}>
                    {formatDate(post.publicationDate)}
                  </div>
                </div>
              )}
              
              <div className={styles.content}>
                {tags.length > 0 && (
                  <div className={styles.tags}>
                    {tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>{tag.trim()}</span>
                    ))}
                    {isAdmin && !post.published && (
                      <span className={`${styles.tag} ${styles.draft}`}>Borrador</span>
                    )}
                  </div>
                )}
                
                <h3 className={styles.title}>
                  {isAdmin ? (
                    <span onClick={() => onEdit?.(post)} className={styles.editableTitle}>
                      {post.title}
                      {!post.published && (
                        <span className={styles.draftBadge}> (Borrador)</span>
                      )}
                    </span>
                  ) : (
                    <Link 
                      href={`/blog/${post.slug || post.id}`}
                      className={styles.titleLink}
                      onClick={(e) => {
                        if (onPostClick) {
                          e.preventDefault();
                          onPostClick(post.id);
                        }
                      }}
                    >
                      {post.title}
                    </Link>
                  )}
                </h3>
                
                <p className={styles.excerpt}>
                  {post.excerpt || post.content.substring(0, 150)}...
                  {!post.excerpt && post.content.length > 150 && (
                    <span className={styles.ellipsis}>...</span>
                  )}
                </p>
                
                <div className={styles.meta}>
                  <span className={styles.author}>
                    <i className="fas fa-user"></i> {post.authorName || 'Admin'}
                  </span>
                  <span className={styles.comments}>
                    <i className="fas fa-comment"></i> {post.commentCount || 0}
                  </span>
                  <span className={styles.views}>
                    <i className="fas fa-eye"></i> {post.viewCount || 0}
                  </span>
                </div>

                {/* Acciones del admin */}
                {isAdmin && (onEdit || onDelete) && (
                  <div className={styles.actions}>
                    {onEdit && (
                      <button 
                        className={styles.editBtn}
                        onClick={() => onEdit(post)}
                        title="Editar post"
                      >
                        <i className="fas fa-edit"></i> Editar
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${post.title}"?`)) {
                            onDelete(post.id);
                          }
                        }}
                        title="Eliminar post"
                      >
                        <i className="fas fa-trash"></i> Eliminar
                      </button>
                    )}
                    <Link 
                      href={`/blog/${post.slug || post.id}`} 
                      className={styles.viewBtn}
                      title="Ver en sitio"
                      target="_blank"
                    >
                      <i className="fas fa-external-link-alt"></i> Ver
                    </Link>
                  </div>
                )}

                {/* Botón para usuarios normales */}
                {!isAdmin && (
                  <Link 
                    href={`/blog/${post.slug || post.id}`}
                    className={styles.readMore}
                    onClick={(e) => {
                      if (onPostClick) {
                        e.preventDefault();
                        onPostClick(post.id);
                      }
                    }}
                  >
                    Leer más <i className="fas fa-arrow-right"></i>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {posts.length === 0 && (
        <div className={styles.empty}>
          <i className="fas fa-newspaper"></i>
          <p>{isAdmin ? 'No hay posts. ¡Crea el primero!' : 'No hay posts disponibles'}</p>
          {isAdmin && (
            <button 
              className={styles.createFirstBtn}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <i className="fas fa-plus"></i> Crear Primer Post
            </button>
          )}
        </div>
      )}
    </div>
  );
}