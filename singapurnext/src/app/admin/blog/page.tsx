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
      <div className={styles.navigationBar}>
        <div className={styles.navButtons}>
          <button 
            className={styles.navButton}
            onClick={() => navigateTo('/admin')}
          >
            Admin
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
            className={styles.navButton}
            onClick={() => navigateTo('/admin/blog')}
          >
            Blog
          </button>
        </div>
      </div>

      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            📝 Administrador de Blog 
            <span className={styles.subtitle}> ({posts.length} posts)</span>
          </h1>
          <div className={styles.headerActions}>
            <button 
              onClick={fetchPosts} 
              className={styles.refreshButton}
              disabled={loading || isSubmitting}
              title="Actualizar lista de posts"
            >
              <i className="fas fa-sync-alt"></i> Actualizar
            </button>
            
            <button 
              className={styles.primaryActionBtn}
              onClick={() => {
                if (showForm) {
                  resetForm();
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
                  <i className="fas fa-times"></i> Cancelar Creación
                </>
              ) : (
                <>
                  <i className="fas fa-plus-circle"></i> Crear Nuevo Post
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{posts.length}</span>
            <span className={styles.statLabel}>Posts Totales</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>
              {posts.filter(p => p.published).length}
            </span>
            <span className={styles.statLabel}>Publicados</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>
              {posts.filter(p => !p.published).length}
            </span>
            <span className={styles.statLabel}>Borradores</span>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <p><i className="fas fa-exclamation-triangle"></i> {error}</p>
          <button onClick={fetchPosts} className={styles.retryBtn}>
            <i className="fas fa-redo"></i> Reintentar
          </button>
        </div>
      )}

      {showForm && (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>
              {editingPost ? (
                <>
                  <i className="fas fa-edit"></i> Editando: &apos;{editingPost.title.substring(0, 50)}...&apos;
                </>
              ) : (
                <>
                  <i className="fas fa-plus-circle"></i> Crear Nuevo Post
                </>
              )}
            </h2>
            <button
              type="button"
              className={styles.closeFormBtn}
              onClick={() => {
                if (window.confirm('¿Cancelar edición? Los cambios no guardados se perderán.')) {
                  resetForm();
                }
              }}
              disabled={isSubmitting}
            >
              <i className="fas fa-times"></i> Cerrar
            </button>
          </div>
          
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Título * <span className={styles.help}>(3-200 caracteres)</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="Ej: Las últimas tendencias de moda 2024"
                  maxLength={200}
                />
                <div className={styles.validation}>
                  {title.length < 3 && title.length > 0 && '❌ Muy corto'}
                  {title.length >= 3 && title.length <= 200 && '✅ Correcto'}
                  {title.length > 200 && '❌ Demasiado largo'}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Autor <span className={styles.optional}>(Opcional)</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Ej: María García"
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Meta Título (SEO) <span className={styles.optional}>(Recomendado)</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Ej: Tendencias Moda 2024 | Singapur Next"
                  maxLength={60}
                />
                <div className={styles.validation}>
                  {metaTitle.length}/60 caracteres
                  <span className={styles.tip}>Aparece en Google y pestañas</span>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Meta Descripción (SEO) <span className={styles.optional}>(Recomendado)</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={2}
                  placeholder="Ej: Descubre las últimas tendencias de moda para 2024. Colección exclusiva..."
                  maxLength={160}
                />
                <div className={styles.validation}>
                  {metaDescription.length}/160 caracteres
                  <span className={styles.tip}>Texto debajo del título en Google</span>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Contenido * <span className={styles.help}>(Mínimo 100 caracteres)</span>
              </label>
              <textarea
                className={styles.textarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                disabled={isSubmitting}
                rows={10}
                placeholder="Escribe el contenido principal del post..."
              />
              <div className={styles.validation}>
                <span className={content.length >= 100 ? styles.valid : styles.invalid}>
                  {content.length} caracteres {content.length < 100 ? '(muy corto)' : ''}
                </span>
                <span className={styles.tip}>Recomendado: 800-1500 caracteres para SEO</span>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Resumen <span className={styles.optional}>(Opcional)</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  disabled={isSubmitting}
                  rows={2}
                  placeholder="Breve descripción que aparece en la lista de posts"
                  maxLength={500}
                />
                <div className={styles.validation}>
                  {excerpt.length}/500 caracteres
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Etiquetas <span className={styles.optional}>(Opcional)</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Ej: moda, tendencias, vestidos, 2024"
                />
                <div className={styles.tip}>Separar con comas. Ej: moda,tendencias,novias</div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  disabled={isSubmitting}
                  className={styles.checkbox}
                />
                <span>Publicar inmediatamente</span>
                <span className={styles.tip}>Desmarcar para guardar como borrador</span>
              </label>
            </div>

            <div className={styles.imagesSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <i className="fas fa-images"></i> Imágenes del Post *
                  <span className={styles.requiredNote}>(Al menos 1 imagen requerida)</span>
                </h3>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={handleAddImage}
                  disabled={isSubmitting}
                >
                  <i className="fas fa-plus"></i> Agregar Imagen
                </button>
              </div>
              
              <div className={styles.imagesGrid}>
                {images.map((image, imageIndex) => (
                  <div key={imageIndex} className={styles.imageCard}>
                    <div className={styles.imageHeader}>
                      <span className={styles.imageNumber}>Imagen {imageIndex + 1}</span>
                      {images.length > 1 && (
                        <button
                          type="button"
                          className={styles.removeSmallButton}
                          onClick={() => handleRemoveImage(imageIndex)}
                          disabled={isSubmitting}
                          title="Eliminar imagen"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                    
                    <div className={styles.uploaderWrapper}>
                      <ImageUploader
                        onUploadSuccess={(imageData) => handleImageUploaded(imageData, imageIndex)}
                        variantIndex={imageIndex}
                        imageIndex={imageIndex}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    {image.imageUrl && image.imageUrl.trim() !== '' && (
                      <div className={styles.imagePreview}>
                        <div className={styles.previewRow}>
                          <Image 
                            src={image.imageUrl} 
                            alt="Preview" 
                            width={80}
                            height={80}
                            className={styles.thumbnail}
                            onError={handleImageError}
                          />
                          <div className={styles.imageActions}>
                            <button
                              type="button"
                              className={styles.copyButton}
                              onClick={() => copyToClipboard(image.imageUrl)}
                              title="Copiar URL"
                            >
                              <i className="fas fa-copy"></i> Copiar URL
                            </button>
                            <label className={styles.featuredLabel}>
                              <input
                                type="checkbox"
                                checked={image.isFeatured || false}
                                onChange={() => handleSetFeaturedImage(imageIndex)}
                                disabled={isSubmitting}
                                className={styles.smallCheckbox}
                              />
                              Destacada
                            </label>
                          </div>
                        </div>
                        
                        <div className={styles.imageFields}>
                          <div className={styles.fieldGroup}>
                            <label className={styles.smallLabel}>
                              Texto alternativo <span className={styles.optional}>(SEO)</span>
                            </label>
                            <input
                              className={styles.smallInput}
                              type="text"
                              value={image.altText || ''}
                              onChange={(e) => handleImageFieldChange(imageIndex, 'altText', e.target.value)}
                              disabled={isSubmitting}
                              placeholder="Descripción para Google"
                            />
                          </div>
                          
                          <div className={styles.fieldGroup}>
                            <label className={styles.smallLabel}>
                              Pie de foto <span className={styles.optional}>(Opcional)</span>
                            </label>
                            <input
                              className={styles.smallInput}
                              type="text"
                              value={image.caption || ''}
                              onChange={(e) => handleImageFieldChange(imageIndex, 'caption', e.target.value)}
                              disabled={isSubmitting}
                              placeholder="Texto debajo de la imagen"
                            />
                          </div>
                          
                          <div className={styles.fieldGroup}>
                            <label className={styles.smallLabel}>
                              Orden de aparición
                            </label>
                            <input
                              type="number"
                              value={image.displayOrder || 0}
                              onChange={(e) => handleImageFieldChange(imageIndex, 'displayOrder', parseInt(e.target.value) || 0)}
                              disabled={isSubmitting}
                              min="0"
                              className={styles.numberInput}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {featuredImageUrl && (
                <div className={styles.featuredImageSection}>
                  <label className={styles.subLabel}>
                    <i className="fas fa-star"></i> Imagen destacada seleccionada
                  </label>
                  <div className={styles.featuredPreview}>
                    <Image 
                      src={featuredImageUrl} 
                      alt="Imagen destacada"
                      width={100}
                      height={100}
                      className={styles.featuredThumbnail}
                      onError={handleFeaturedImageError}
                    />
                    <div className={styles.urlContainer}>
                      <label className={styles.urlLabel}>URL de la imagen destacada:</label>
                      <input
                        className={styles.urlInput}
                        type="text"
                        value={featuredImageUrl}
                        onChange={(e) => setFeaturedImageUrl(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="URL de imagen destacada"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formActions}>
              <button 
                className={`${styles.button} ${styles.primaryButton}`} 
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
                    <i className="fas fa-save"></i> Actualizar Post
                  </>
                ) : (
                  <>
                    <i className="fas fa-rocket"></i> Crear Post
                  </>
                )}
              </button>

              <button
                type="button"
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={resetForm}
                disabled={isSubmitting}
              >
                <i className="fas fa-times"></i> Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sección de lista de posts */}
      <div className={styles.postsSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>
              <i className="fas fa-list"></i> Lista de Posts
              <span className={styles.postsCount}> ({posts.length})</span>
            </h2>
            
            {!showForm && (
              <button 
                className={styles.floatingCreateBtn}
                onClick={() => setShowForm(true)}
                title="Crear nuevo post"
              >
                <i className="fas fa-plus"></i> Nuevo Post
              </button>
            )}
          </div>
          
          <div className={styles.searchFilters}>
            <input
              type="text"
              placeholder="Buscar posts..."
              className={styles.searchInput}
            />
            <div className={styles.filterButtons}>
              <button className={styles.filterBtn} title="Mostrar todos">
                Todos
              </button>
              <button className={styles.filterBtn} title="Mostrar publicados">
                Publicados
              </button>
              <button className={styles.filterBtn} title="Mostrar borradores">
                Borradores
              </button>
            </div>
          </div>
        </div>
        
        {loading && posts.length === 0 ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIllustration}>
              <i className="fas fa-newspaper"></i>
            </div>
            <h3>¡No hay posts todavía!</h3>
            <p>Crea tu primer post para empezar a compartir contenido.</p>
            <button 
              className={styles.createFirstBtn}
              onClick={() => setShowForm(true)}
            >
              <i className="fas fa-plus"></i> Crear Primer Post
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
            
            {/* Botón flotante adicional para móviles */}
            <button 
              className={styles.mobileCreateBtn}
              onClick={() => setShowForm(true)}
              title="Crear nuevo post"
            >
              <i className="fas fa-plus"></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
}