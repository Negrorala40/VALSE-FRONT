'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './BlogComments.module.css';

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

interface BlogCommentsProps {
  postId: number;
  comments: Comment[];
  isAdmin?: boolean;
  onCommentAdded?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function BlogComments({ 
  postId, 
  comments: initialComments, 
  isAdmin = false,
  onCommentAdded
}: BlogCommentsProps) {
  
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    content: ''
  });

  // 🔄 Función para obtener comentarios del servidor
  const fetchComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const response = await fetch(
        `${API_URL}/api/blog/${postId}/comments?page=0&size=50&sort=createdAt,desc`,
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
        setComments(commentsData);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  // 🔄 Obtener comentarios al cargar el componente y cuando postId cambie
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha no disponible';
      
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha no disponible';
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validación básica
    if (!formData.userName.trim() || !formData.userEmail.trim() || !formData.content.trim()) {
      setError('Todos los campos son obligatorios');
      setLoading(false);
      return;
    }

    if (!formData.userEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Por favor, ingresa un email válido');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/blog/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          userName: formData.userName.trim(),
          userEmail: formData.userEmail.trim(),
          content: formData.content.trim(),
          blogPostId: postId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al enviar comentario');
      }
      
      // No necesitamos asignar el resultado a una variable si no lo usamos
      await response.json();
      
      // 🔄 OBTENER TODOS LOS COMENTARIOS NUEVAMENTE DEL SERVIDOR
      await fetchComments();
      
      // Limpiar formulario
      setFormData({ userName: '', userEmail: '', content: '' });
      setShowForm(false);
      setSuccess('¡Comentario enviado con éxito! Ya está visible.');
      
      // Notificar al componente padre
      if (onCommentAdded) {
        onCommentAdded();
      }
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? (err.message.includes('JSON') 
          ? 'Error del servidor. Intenta nuevamente.' 
          : err.message)
        : 'Error desconocido al enviar el comentario';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/blog/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al eliminar comentario');
      }
      
      // 🔄 OBTENER COMENTARIOS ACTUALIZADOS DEL SERVIDOR
      await fetchComments();
      setSuccess('Comentario eliminado correctamente');
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error al eliminar comentario';
      setError(errorMessage);
    }
  };

  const handleApprove = async (commentId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/api/blog/comments/${commentId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al aprobar comentario');
      }
      
      // 🔄 OBTENER COMENTARIOS ACTUALIZADOS DEL SERVIDOR
      await fetchComments();
      setSuccess('Comentario aprobado correctamente');
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Error al aprobar comentario';
      setError(errorMessage);
    }
  };

  // Filtrar comentarios aprobados para usuarios normales
  const displayComments = isAdmin 
    ? comments 
    : comments.filter(comment => comment.approved);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <i className="fas fa-comments"></i> 
          Comentarios ({displayComments.length})
        </h3>
        
        {!showForm && !isAdmin && (
          <button 
            className={styles.addBtn}
            onClick={() => setShowForm(true)}
            type="button"
          >
            <i className="fas fa-plus"></i> Añadir comentario
          </button>
        )}
      </div>

      {/* Mensajes de éxito/error */}
      {success && (
        <div className={styles.successMessage}>
          <i className="fas fa-check-circle"></i> {success}
          <button 
            onClick={() => setSuccess('')}
            className={styles.closeMessage}
            type="button"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          <i className="fas fa-exclamation-circle"></i> {error}
          <button 
            onClick={() => setError('')}
            className={styles.closeMessage}
            type="button"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Loading de comentarios */}
      {loadingComments && (
        <div className={styles.loadingComments}>
          <div className={styles.spinner}></div>
          <p>Cargando comentarios...</p>
        </div>
      )}

      {/* Formulario de comentario */}
      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formHeader}>
            <h4>Deja tu comentario</h4>
            <button 
              type="button" 
              className={styles.closeBtn}
              onClick={() => setShowForm(false)}
              disabled={loading}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="userName">Nombre *</label>
            <input
              type="text"
              id="userName"
              placeholder="Tu nombre"
              value={formData.userName}
              onChange={(e) => setFormData({...formData, userName: e.target.value})}
              required
              disabled={loading}
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="userEmail">Email *</label>
            <input
              type="email"
              id="userEmail"
              placeholder="tu@email.com"
              value={formData.userEmail}
              onChange={(e) => setFormData({...formData, userEmail: e.target.value})}
              required
              disabled={loading}
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="content">Comentario *</label>
            <textarea
              id="content"
              placeholder="Escribe tu comentario..."
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={4}
              required
              disabled={loading}
              minLength={5}
              maxLength={1000}
            />
            <div className={styles.charCount}>
              {formData.content.length}/1000 caracteres
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Enviando...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> Enviar comentario
                </>
              )}
            </button>
            
            <div className={styles.formNote}>
              <i className="fas fa-info-circle"></i>
              <small>Tu comentario será publicado inmediatamente.</small>
            </div>
          </div>
        </form>
      )}

      {/* Lista de comentarios */}
      <div className={styles.commentsList}>
        {!loadingComments && displayComments.length > 0 ? (
          displayComments.map((comment) => (
            <div 
              key={comment.id} 
              className={`${styles.comment} ${!comment.approved ? styles.pending : ''}`}
            >
              <div className={styles.commentHeader}>
                <div className={styles.authorInfo}>
                  <div className={styles.avatar}>
                    {getInitial(comment.userName)}
                  </div>
                  <div className={styles.authorDetails}>
                    <strong className={styles.authorName}>{comment.userName}</strong>
                    <small className={styles.authorEmail}>{comment.userEmail}</small>
                  </div>
                </div>
                
                <div className={styles.commentMeta}>
                  <span className={styles.date}>
                    <i className="far fa-clock"></i> {formatDate(comment.createdAt)}
                  </span>
                  
                  {isAdmin && !comment.approved && (
                    <button
                      onClick={() => handleApprove(comment.id)}
                      className={styles.approveBtn}
                      title="Aprobar comentario"
                      type="button"
                    >
                      <i className="fas fa-check"></i> Aprobar
                    </button>
                  )}
                  
                  {!comment.approved && (
                    <span className={styles.pendingBadge}>
                      <i className="fas fa-clock"></i> Pendiente
                    </span>
                  )}
                  
                  {isAdmin && (
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className={styles.deleteBtn}
                      title="Eliminar comentario"
                      type="button"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
              
              <div className={styles.commentContent}>
                {comment.content}
              </div>
            </div>
          ))
        ) : !loadingComments ? (
          <div className={styles.emptyComments}>
            <i className="far fa-comment-dots"></i>
            <p>Sé el primero en comentar</p>
            {!showForm && !isAdmin && (
              <button 
                className={styles.addCommentBtn}
                onClick={() => setShowForm(true)}
                type="button"
              >
                <i className="fas fa-plus"></i> Escribir comentario
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}