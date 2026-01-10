'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './BlogContent.module.css';

// TIPOS compatibles con tu backend
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
  
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha no disponible';
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  // Función para obtener la imagen principal
  const getFeaturedImage = (post: BlogPost): string => {
    // 1. Usar featuredImageUrl si existe y es válida
    if (post.featuredImageUrl && post.featuredImageUrl.trim() !== '') {
      return post.featuredImageUrl;
    }
    
    // 2. Buscar en images
    if (post.images && post.images.length > 0) {
      // Buscar imagen destacada
      const featuredImage = post.images.find(img => img.isFeatured);
      if (featuredImage?.imageUrl?.trim()) {
        return featuredImage.imageUrl;
      }
      
      // O usar la primera imagen
      const firstImage = post.images[0];
      if (firstImage?.imageUrl?.trim()) {
        return firstImage.imageUrl;
      }
    }
    
    // 3. Imagen por defecto
    return '/images/blog-placeholder.jpg';
  };

  // Función para extraer tags
  const extractTags = (tags: string): string[] => {
    if (!tags || typeof tags !== 'string' || tags.trim() === '') return [];
    
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '')
      .slice(0, 3);
  };

  // Manejar clic en post
  const handlePostClick = (e: React.MouseEvent, postId: number) => {
    if (onPostClick) {
      e.preventDefault();
      onPostClick(postId);
    }
  };

  return (
    <div className={styles.container}>
      {isAdmin && posts.length > 0 && (
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
          const postUrl = `/blog/${post.slug || post.id}`;
          const isPublished = post.published !== false; // Por defecto true
          
          return (
            <div key={post.id} className={styles.card}>
              {/* Imagen */}
              <div className={styles.imageContainer}>
                <Link 
                  href={postUrl} 
                  onClick={(e) => handlePostClick(e, post.id)}
                  className={styles.imageLink}
                >
                  <img 
                    src={featuredImage} 
                    alt={post.title || 'Imagen del post'}
                    className={styles.image}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = '/images/blog-placeholder.jpg';
                      e.currentTarget.classList.add(styles.placeholderImage);
                    }}
                  />
                  <div className={styles.date}>
                    {formatDate(post.publicationDate)}
                  </div>
                  {isAdmin && !isPublished && (
                    <div className={styles.draftOverlay}>
                      <span className={styles.draftText}>BORRADOR</span>
                    </div>
                  )}
                </Link>
              </div>
              
              {/* Contenido */}
              <div className={styles.content}>
                {/* Tags */}
                {tags.length > 0 && (
                  <div className={styles.tags}>
                    {tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                    {isAdmin && !isPublished && (
                      <span className={`${styles.tag} ${styles.draft}`}>Borrador</span>
                    )}
                  </div>
                )}
                
                {/* Título */}
                <h3 className={styles.title}>
                  {isAdmin ? (
                    <span 
                      onClick={() => onEdit?.(post)} 
                      className={styles.editableTitle}
                    >
                      {post.title || 'Sin título'}
                      {!isPublished && (
                        <span className={styles.draftBadge}> (Borrador)</span>
                      )}
                    </span>
                  ) : (
                    <Link 
                      href={postUrl}
                      className={styles.titleLink}
                      onClick={(e) => handlePostClick(e, post.id)}
                    >
                      {post.title || 'Sin título'}
                    </Link>
                  )}
                </h3>
                
                {/* Extracto */}
                <p className={styles.excerpt}>
                  {post.excerpt || 
                   (post.content 
                    ? `${post.content.substring(0, 150).replace(/<[^>]*>/g, '')}...`
                    : 'Sin contenido disponible')}
                </p>
                
                {/* Meta información */}
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
                        type="button"
                      >
                        <i className="fas fa-edit"></i> Editar
                      </button>
                    )}
                    {onDelete && (
                      <button 
                        className={styles.deleteBtn}
                        onClick={() => {
                          if (window.confirm(`¿Eliminar definitivamente "${post.title}"?\nEsta acción no se puede deshacer.`)) {
                            onDelete(post.id);
                          }
                        }}
                        title="Eliminar post"
                        type="button"
                      >
                        <i className="fas fa-trash"></i> Eliminar
                      </button>
                    )}
                    <Link 
                      href={postUrl} 
                      className={styles.viewBtn}
                      title="Ver en sitio"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-external-link-alt"></i> Ver
                    </Link>
                  </div>
                )}

                {/* Botón para usuarios normales */}
                {!isAdmin && (
                  <Link 
                    href={postUrl}
                    className={styles.readMore}
                    onClick={(e) => handlePostClick(e, post.id)}
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
              type="button"
            >
              <i className="fas fa-plus"></i> Crear Primer Post
            </button>
          )}
        </div>
      )}
    </div>
  );
}