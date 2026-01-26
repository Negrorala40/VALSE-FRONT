'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import BlogContent from '@/app/components/BlogContent/BlogContent';
import styles from './AdminBlogPage.module.css';
import ImageUploader from '@/app/components/ImageUploader';
import {
  BLOG_ADMIN_POSTS_PAGINATED,
  BLOG_CREATE,
  BLOG_UPDATE,
  BLOG_DELETE
} from '@/app/utils/Api';

// TIPOS COMPATIBLES con BlogContent
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
}

interface ImageData {
  fileName: string;
  imageUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
}

interface ApiBlogPost {
  id?: number;
  title: string;
  content: string;
  excerpt: string;
  featuredImageUrl?: string;
  tags: string;
  authorName: string;
  published: boolean;
  slug?: string;
  viewCount?: number;
  commentCount?: number;
  metaTitle?: string;
  metaDescription?: string;
  images?: {
    id?: number;
    imageUrl: string;
    altText?: string;
    caption?: string;
    displayOrder?: number;
    isFeatured?: boolean;
  }[];
}

interface ApiResponse {
  content?: ApiBlogPost[];
  success?: boolean;
  message?: string;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Campos del formulario
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tags, setTags] = useState('');
  const [authorName, setAuthorName] = useState('Admin');
  const [published, setPublished] = useState(true);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [images, setImages] = useState<BlogImage[]>([{
    imageUrl: '',
    altText: '',
    caption: '',
    displayOrder: 0,
    isFeatured: false
  }]);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');

  // Función para navegación
  const navigateTo = (path: string) => {
    router.push(path);
  };

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await fetch(BLOG_ADMIN_POSTS_PAGINATED(0, 100), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data: ApiResponse = await response.json();
      const postsData = data.content || [];
      const formattedPosts = postsData.map(formatPostFromAPI);
      setPosts(formattedPosts);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar posts';
      setError(errorMessage);
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const formatPostFromAPI = (post: ApiBlogPost): BlogPost => ({
    id: post.id || 0,
    title: post.title || '',
    content: post.content || '',
    excerpt: post.excerpt || '',
    featuredImageUrl: post.featuredImageUrl || '',
    publicationDate: new Date().toISOString(),
    tags: post.tags || '',
    authorName: post.authorName || 'Admin',
    published: post.published ?? true,
    slug: post.slug || '',
    viewCount: post.viewCount || 0,
    commentCount: post.commentCount || 0,
    metaTitle: post.metaTitle || '',
    metaDescription: post.metaDescription || '',
    images: post.images?.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl || '',
      altText: img.altText || '',
      caption: img.caption || '',
      displayOrder: img.displayOrder || 0,
      isFeatured: img.isFeatured || false
    })) || []
  });

  useEffect(() => {
    const storedRole = localStorage.getItem('role');
    if (storedRole !== 'ROLE_ADMIN') {
      router.push('/');
    } else {
      setRole(storedRole);
      fetchPosts();
    }
  }, [router, fetchPosts]);

  const handleImageUploaded = (imageData: ImageData, imageIndex?: number) => {
    if (imageIndex === undefined) return;

    const updatedImages = [...images];
    if (imageIndex < updatedImages.length) {
      const image = updatedImages[imageIndex];
      image.imageUrl = imageData.imageUrl;
      
      if (!featuredImageUrl && imageIndex === 0) {
        setFeaturedImageUrl(imageData.imageUrl);
        image.isFeatured = true;
      }
      
      setImages(updatedImages);
    }
  };

  const handleAddImage = () => {
    setImages([
      ...images,
      {
        imageUrl: '',
        altText: '',
        caption: '',
        displayOrder: images.length,
        isFeatured: false
      }
    ]);
  };

  const handleRemoveImage = (imageIndex: number) => {
    if (images.length > 1) {
      const updatedImages = images.filter((_, i) => i !== imageIndex);
      updatedImages.forEach((img, idx) => {
        img.displayOrder = idx;
      });
      setImages(updatedImages);
    }
  };

  const handleSetFeaturedImage = (imageIndex: number) => {
    const updatedImages = images.map((img, idx) => ({
      ...img,
      isFeatured: idx === imageIndex
    }));
    
    const featuredImage = updatedImages[imageIndex];
    setFeaturedImageUrl(featuredImage.imageUrl);
    setImages(updatedImages);
  };

  const handleImageFieldChange = (
    imageIndex: number, 
    field: keyof BlogImage, 
    value: string | boolean | number
  ) => {
    const updatedImages = [...images];
    const image = updatedImages[imageIndex];
    
    if (field === 'altText') image.altText = value as string;
    else if (field === 'caption') image.caption = value as string;
    else if (field === 'displayOrder') image.displayOrder = Number(value);
    else if (field === 'isFeatured') {
      image.isFeatured = value as boolean;
      if (value) setFeaturedImageUrl(image.imageUrl);
    }
    
    setImages(updatedImages);
  };

  const validateForm = (): boolean => {
    // Validación de título
    if (!title.trim()) {
      alert('❌ El título es obligatorio. Debe tener entre 3 y 200 caracteres.');
      return false;
    }
    
    if (title.trim().length < 3 || title.trim().length > 200) {
      alert('❌ El título debe tener entre 3 y 200 caracteres.');
      return false;
    }

    // Validación de contenido
    if (!content.trim()) {
      alert('❌ El contenido es obligatorio.');
      return false;
    }

    // Validación de imágenes
    const emptyImages = images.filter(img => !img.imageUrl.trim());
    if (emptyImages.length > 0) {
      alert(`❌ Hay ${emptyImages.length} imagen(es) sin subir.`);
      return false;
    }

    return true;
  };

  const preparePostDataForBackend = (): ApiBlogPost => {
    const postData: ApiBlogPost = {
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt.trim(),
      featuredImageUrl: featuredImageUrl.trim(),
      tags: tags.trim(),
      published,
      authorName: authorName.trim() || 'Admin',
      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      images: images.map(img => ({
        imageUrl: img.imageUrl.trim(),
        altText: img.altText?.trim() || '',
        caption: img.caption?.trim() || '',
        displayOrder: img.displayOrder || 0,
        isFeatured: img.isFeatured || false
      }))
    };

    return postData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const postData = preparePostDataForBackend();
      const token = localStorage.getItem('token');
      
      const url = editingPost?.id 
        ? BLOG_UPDATE(editingPost.id)
        : BLOG_CREATE;
      
      const method = editingPost?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}`);
      }

      alert(editingPost?.id ? '✅ Post actualizado correctamente' : '✅ Post creado correctamente');
      fetchPosts();
      resetForm();
    } catch (err: unknown) {
      console.error('Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error del servidor';
      const errorMsg = errorMessage.includes('JSON') 
        ? 'Error del servidor. Intente nuevamente.' 
        : errorMessage;
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setExcerpt('');
    setTags('');
    setAuthorName('Admin');
    setPublished(true);
    setMetaTitle('');
    setMetaDescription('');
    setImages([{
      imageUrl: '',
      altText: '',
      caption: '',
      displayOrder: 0,
      isFeatured: false
    }]);
    setFeaturedImageUrl('');
    setEditingPost(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (post: BlogPost) => {
    setTitle(post.title);
    setContent(post.content);
    setExcerpt(post.excerpt || '');
    setTags(post.tags || '');
    setAuthorName(post.authorName || 'Admin');
    setPublished(post.published);
    setMetaTitle(post.metaTitle || '');
    setMetaDescription(post.metaDescription || '');
    setFeaturedImageUrl(post.featuredImageUrl || '');
    
    if (post.images && post.images.length > 0) {
      setImages(post.images.map(img => ({
        imageUrl: img.imageUrl || '',
        altText: img.altText || '',
        caption: img.caption || '',
        displayOrder: img.displayOrder || 0,
        isFeatured: img.isFeatured || false
      })));
    } else {
      setImages([{
        imageUrl: '',
        altText: '',
        caption: '',
        displayOrder: 0,
        isFeatured: false
      }]);
    }
    
    setEditingPost(post);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;

    if (!window.confirm(`¿Eliminar definitivamente "${post.title}"?\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(BLOG_DELETE(id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        alert('✅ Post eliminado correctamente');
        fetchPosts();
      } else {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión';
      setError(errorMessage);
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('✅ URL copiada al portapapeles'))
      .catch(err => console.error('Error copiando:', err));
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://via.placeholder.com/80?text=Error';
  };

  const handleFeaturedImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = 'https://via.placeholder.com/100?text=Error';
  };

  if (role !== 'ROLE_ADMIN') {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>⛔ Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
        <button 
          className={styles.button}
          onClick={() => router.push('/')}
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  if (loading && !showForm) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Cargando posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Barra de navegación */}
      <div className={styles.adminHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.adminTitle}>Panel de Administración</h1>
          <div className={styles.headerMeta}>
            <span className={styles.pageBadge}>Blog</span>
            <span className={styles.postCount}>{posts.length} posts</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/admin')}
          >
            Productos
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/perfil')}
          >
            Perfil
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/meta')}
          >
            Meta
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/orden')}
          >
            Órdenes
          </button>
          <button 
            className={`${styles.navButton} ${styles.active}`}
            onClick={() => navigateTo('/admin/blog')}
          >
            Blog
          </button>
        </div>
      </div>

      {/* Panel de control */}
      <div className={styles.controlPanel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            Gestión de Contenido del Blog
          </h2>
          <div className={styles.panelActions}>
            <button 
              onClick={fetchPosts} 
              className={styles.refreshButton}
              disabled={loading || isSubmitting}
              title="Actualizar lista de posts"
            >
              <span className={styles.buttonIcon}>🔄</span>
              Actualizar
            </button>
            
            <button 
              className={styles.primaryButton}
              onClick={() => {
                if (showForm) {
                  if (window.confirm('¿Cancelar edición? Los cambios no guardados se perderán.')) {
                    resetForm();
                  }
                } else {
                  setShowForm(true);
                  setEditingPost(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              type="button"
              disabled={isSubmitting}
            >
              {showForm ? (
                <>
                  <span className={styles.buttonIcon}>×</span>
                  Cancelar
                </>
              ) : (
                <>
                  <span className={styles.buttonIcon}>+</span>
                  Crear Post
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>📄</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>{posts.length}</span>
              <span className={styles.statLabel}>Posts Totales</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>✅</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>
                {posts.filter(p => p.published).length}
              </span>
              <span className={styles.statLabel}>Publicados</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>📝</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>
                {posts.filter(p => !p.published).length}
              </span>
              <span className={styles.statLabel}>Borradores</span>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <span className={styles.statIcon}>👁️</span>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statNumber}>
                {posts.reduce((sum, post) => sum + (post.viewCount || 0), 0)}
              </span>
              <span className={styles.statLabel}>Visitas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className={styles.errorAlert}>
          <div className={styles.errorContent}>
            <span className={styles.errorIcon}>⚠️</span>
            <div className={styles.errorText}>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <button onClick={fetchPosts} className={styles.retryButton}>
            <span className={styles.buttonIcon}>🔄</span>
            Reintentar
          </button>
        </div>
      )}

      {/* Formulario de creación/edición */}
      {showForm && (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <div className={styles.formTitleContainer}>
              <h3 className={styles.formTitle}>
                {editingPost ? '✏️ Editando Post' : '➕ Crear Nuevo Post'}
              </h3>
              {editingPost && (
                <span className={styles.editingIndicator}>
                  Editando: <strong>{editingPost.title.substring(0, 40)}...</strong>
                </span>
              )}
            </div>
            <div className={styles.formInfo}>
              <span className={styles.formInfoItem}>* Campos obligatorios</span>
              <span className={styles.formInfoItem}>📸 Imagen destacada requerida</span>
            </div>
          </div>
          
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Sección de información básica */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>📋</span>
                  Información Básica
                </h4>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Título del Post <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={isSubmitting}
                    placeholder="Escribe un título atractivo para el post..."
                    maxLength={200}
                  />
                  <div className={styles.fieldValidation}>
                    <span className={title.length >= 3 ? styles.valid : styles.invalid}>
                      {title.length}/200 caracteres
                    </span>
                    {title.length < 3 && title.length > 0 && (
                      <span className={styles.validationWarning}>❌ Mínimo 3 caracteres</span>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Autor
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Nombre del autor"
                  />
                  <div className={styles.fieldTip}>
                    Dejar vacío para usar &quot;Admin&quot; por defecto
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Contenido Principal <span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={8}
                  placeholder="Escribe el contenido completo del post aquí..."
                />
                <div className={styles.fieldValidation}>
                  <span className={content.length >= 100 ? styles.valid : styles.invalid}>
                    {content.length} caracteres
                  </span>
                  {content.length < 100 && (
                    <span className={styles.validationWarning}>❌ Mínimo 100 caracteres recomendados</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sección de SEO */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <h4 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>🔍</span>
                  Optimización SEO
                </h4>
                <div className={styles.sectionHelp}>
                  Mejora la visibilidad en motores de búsqueda
                </div>
              </div>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Meta Título
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Título que aparece en Google (recomendado 50-60 caracteres)"
                    maxLength={60}
                  />
                  <div className={styles.fieldValidation}>
                    <span className={styles.seoIndicator}>
                      {metaTitle.length}/60 caracteres
                    </span>
                    <div className={styles.fieldTip}>
                      Ideal para resultados de búsqueda
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Meta Descripción
                  </label>
                  <textarea
                    className={`${styles.textarea} ${styles.smallTextarea}`}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    disabled={isSubmitting}
                    rows={2}
                    placeholder="Breve descripción que aparece debajo del título en Google"
                    maxLength={160}
                  />
                  <div className={styles.fieldValidation}>
                    <span className={styles.seoIndicator}>
                      {metaDescription.length}/160 caracteres
                    </span>
                    <div className={styles.fieldTip}>
                      Resumen atractivo para los usuarios
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Resumen (Excerpt)
                  </label>
                  <textarea
                    className={styles.textarea}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    disabled={isSubmitting}
                    rows={3}
                    placeholder="Breve resumen que aparece en listados y tarjetas del post"
                    maxLength={500}
                  />
                  <div className={styles.fieldValidation}>
                    <span className={styles.excerptIndicator}>
                      {excerpt.length}/500 caracteres
                    </span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Etiquetas
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Etiquetas separadas por comas (ej: moda, tendencias, estilo)"
                  />
                  <div className={styles.fieldTip}>
                    Ayuda a organizar y categorizar el contenido
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de imágenes */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleRow}>
                  <h4 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>🖼️</span>
                    Imágenes del Post
                  </h4>
                  <span className={styles.imageCount}>
                    {images.length} imagen{images.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className={styles.sectionHelp}>
                  Sube y organiza las imágenes del post
                </div>
              </div>
              
              <div className={styles.imagesContainer}>
                {images.map((image, imageIndex) => (
                  <div key={imageIndex} className={styles.imageCard}>
                    <div className={styles.imageHeader}>
                      <div className={styles.imageHeaderLeft}>
                        <span className={styles.imageNumber}>Imagen {imageIndex + 1}</span>
                        {image.isFeatured && (
                          <span className={styles.featuredBadge}>⭐ Destacada</span>
                        )}
                      </div>
                      <div className={styles.imageActions}>
                        {images.length > 1 && (
                          <button
                            type="button"
                            className={styles.removeImageButton}
                            onClick={() => handleRemoveImage(imageIndex)}
                            disabled={isSubmitting}
                            title="Eliminar imagen"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.uploaderSection}>
                      <ImageUploader
                        onUploadSuccess={(imageData) => handleImageUploaded(imageData, imageIndex)}
                        variantIndex={imageIndex}
                        imageIndex={imageIndex}
                        disabled={isSubmitting}
                        initialImageUrl={image.imageUrl}
                      />
                    </div>
                    
                    {image.imageUrl && image.imageUrl.trim() !== '' && (
                      <div className={styles.imageDetails}>
                        <div className={styles.imagePreviewRow}>
                          <div className={styles.previewContainer}>
                            <Image 
                              src={image.imageUrl} 
                              alt="Vista previa" 
                              width={80}
                              height={80}
                              className={styles.imagePreview}
                              onError={handleImageError}
                            />
                          </div>
                          <div className={styles.imageInfo}>
                            <button
                              type="button"
                              className={styles.copyUrlButton}
                              onClick={() => copyToClipboard(image.imageUrl)}
                              title="Copiar URL de la imagen"
                            >
                              <span className={styles.buttonIcon}>📋</span>
                              Copiar URL
                            </button>
                            
                            <label className={styles.featuredCheckbox}>
                              <input
                                type="checkbox"
                                checked={image.isFeatured || false}
                                onChange={() => handleSetFeaturedImage(imageIndex)}
                                disabled={isSubmitting}
                                className={styles.checkbox}
                              />
                              <span className={styles.checkboxLabel}>
                                {image.isFeatured ? '✅ Imagen destacada' : 'Establecer como destacada'}
                              </span>
                            </label>
                          </div>
                        </div>
                        
                        <div className={styles.imageFields}>
                          <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>
                              Texto alternativo (SEO)
                            </label>
                            <input
                              className={styles.fieldInput}
                              type="text"
                              value={image.altText || ''}
                              onChange={(e) => handleImageFieldChange(imageIndex, 'altText', e.target.value)}
                              disabled={isSubmitting}
                              placeholder="Describe la imagen para motores de búsqueda"
                            />
                          </div>
                          
                          <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>
                              Pie de foto
                            </label>
                            <input
                              className={styles.fieldInput}
                              type="text"
                              value={image.caption || ''}
                              onChange={(e) => handleImageFieldChange(imageIndex, 'caption', e.target.value)}
                              disabled={isSubmitting}
                              placeholder="Texto que aparece debajo de la imagen"
                            />
                          </div>
                          
                          <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel}>
                              Orden de aparición
                            </label>
                            <div className={styles.orderInputContainer}>
                              <input
                                type="number"
                                value={image.displayOrder || 0}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!isNaN(value) && value >= 0) {
                                    handleImageFieldChange(imageIndex, 'displayOrder', value);
                                  }
                                }}
                                disabled={isSubmitting}
                                min="0"
                                className={styles.orderInput}
                                onKeyPress={(e) => {
                                  if (!/^\d$/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                              <span className={styles.orderHelp}>0 = primero</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className={styles.addImageContainer}>
                <button
                  type="button"
                  className={styles.addImageButton}
                  onClick={handleAddImage}
                  disabled={isSubmitting || images.length >= 10}
                >
                  <span className={styles.buttonIcon}>+</span>
                  Agregar otra imagen
                </button>
                <div className={styles.addImageHelp}>
                  Puedes agregar hasta 10 imágenes por post. Mínimo 1 imagen requerida.
                </div>
              </div>
              
              {featuredImageUrl && (
                <div className={styles.featuredImageSection}>
                  <div className={styles.featuredHeader}>
                    <h5 className={styles.featuredTitle}>
                      <span className={styles.featuredIcon}>⭐</span>
                      Imagen Destacada Seleccionada
                    </h5>
                    <span className={styles.featuredNote}>
                      Aparece como miniatura principal en listados
                    </span>
                  </div>
                  <div className={styles.featuredContent}>
                    <div className={styles.featuredPreview}>
                      <Image 
                        src={featuredImageUrl} 
                        alt="Imagen destacada"
                        width={120}
                        height={120}
                        className={styles.featuredImage}
                        onError={handleFeaturedImageError}
                      />
                    </div>
                    <div className={styles.featuredInfo}>
                      <label className={styles.urlLabel}>
                        URL de la imagen destacada:
                      </label>
                      <div className={styles.urlContainer}>
                        <input
                          className={styles.urlInput}
                          type="text"
                          value={featuredImageUrl}
                          onChange={(e) => setFeaturedImageUrl(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="URL de la imagen destacada"
                        />
                        <button
                          type="button"
                          className={styles.copyUrlButton}
                          onClick={() => copyToClipboard(featuredImageUrl)}
                          title="Copiar URL"
                        >
                          📋
                        </button>
                      </div>
                      <div className={styles.urlHelp}>
                        Esta imagen será la miniatura principal del post
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sección de estado y envío */}
            <div className={styles.formSection}>
              <div className={styles.formActions}>
                <div className={styles.statusSection}>
                  <label className={styles.statusLabel}>
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      disabled={isSubmitting}
                      className={styles.statusCheckbox}
                    />
                    <span className={styles.statusText}>
                      {published ? '✅ Publicar inmediatamente' : '💾 Guardar como borrador'}
                    </span>
                  </label>
                  <div className={styles.statusHelp}>
                    {published 
                      ? 'El post será visible públicamente al guardar'
                      : 'El post se guardará pero no será visible públicamente'
                    }
                  </div>
                </div>
                
                <div className={styles.submitButtons}>
                  <button 
                    className={`${styles.submitButton} ${styles.primarySubmit}`} 
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className={styles.loadingSpinner}></span>
                        Procesando...
                      </>
                    ) : editingPost ? (
                      <>
                        <span className={styles.buttonIcon}>💾</span>
                        Actualizar Post
                      </>
                    ) : (
                      <>
                        <span className={styles.buttonIcon}>🚀</span>
                        Publicar Post
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`${styles.submitButton} ${styles.secondarySubmit}`}
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    <span className={styles.buttonIcon}>↩️</span>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Lista de posts */}
      <div className={styles.postsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleContainer}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📋</span>
              Lista de Posts
            </h3>
            <span className={styles.postsCount}>
              {posts.length} post{posts.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {!showForm && (
            <div className={styles.sectionActions}>
              <button 
                className={styles.createPostButton}
                onClick={() => {
                  setShowForm(true);
                  setEditingPost(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                title="Crear nuevo post"
              >
                <span className={styles.buttonIcon}>+</span>
                Nuevo Post
              </button>
            </div>
          )}
        </div>
        
        {loading && posts.length === 0 ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Cargando posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIllustration}>
              <span className={styles.emptyIcon}>📝</span>
            </div>
            <h4 className={styles.emptyTitle}>No hay posts todavía</h4>
            <p className={styles.emptyDescription}>
              Crea tu primer post para empezar a compartir contenido con tus usuarios.
            </p>
            <button 
              className={styles.createFirstButton}
              onClick={() => setShowForm(true)}
            >
              <span className={styles.buttonIcon}>+</span>
              Crear Primer Post
            </button>
          </div>
        ) : (
          <>
            <BlogContent
              posts={posts}
              isAdmin={true}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            
            {/* Botón flotante para móviles */}
            <button 
              className={styles.floatingCreateButton}
              onClick={() => {
                setShowForm(true);
                setEditingPost(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              title="Crear nuevo post"
            >
              <span className={styles.buttonIcon}>+</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}