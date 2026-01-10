'use client';

import { useState } from 'react';
import styles from './BlogComments.module.css';

interface Comment {
  id: number;
  userName: string;
  userEmail: string;
  content: string;
  createdAt: string;
  approved: boolean;
  blogPostId: number;
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
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    content: ''
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/blog/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          ...formData,
          blogPostId: postId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al enviar comentario');
      }
      
      const newComment = await response.json();
      setComments([newComment, ...comments]);
      setFormData({ userName: '', userEmail: '', content: '' });
      setShowForm(false);
      setError('');
      
      // Notificar al componente padre
      if (onCommentAdded) {
        onCommentAdded();
      }
      
    } catch (err: any) {
      setError(err.message || 'Error al enviar comentario');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!window.confirm('¿Eliminar este comentario?')) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('No tienes permisos para eliminar comentarios');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/blog/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar comentario');
      }
      
      setComments(comments.filter(c => c.id !== commentId));
      setError('');
      
    } catch (err: any) {
      setError(err.message || 'Error al eliminar comentario');
    }
  };

  // Filtrar comentarios aprobados para usuarios normales
  const displayComments = isAdmin 
    ? comments 
    : comments.filter(comment => comment.approved);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>
          <i className="fas fa-comments"></i> 
          Comentarios ({displayComments.length})
        </h3>
        
        {!showForm && (
          <button 
            className={styles.addBtn}
            onClick={() => setShowForm(true)}
            type="button"
          >
            <i className="fas fa-plus"></i> Añadir comentario
          </button>
        )}
      </div>

      {/* Formulario */}
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

          {error && (
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Tu nombre *"
              value={formData.userName}
              onChange={(e) => setFormData({...formData, userName: e.target.value})}
              required
              disabled={loading}
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="email"
              placeholder="Tu email *"
              value={formData.userEmail}
              onChange={(e) => setFormData({...formData, userEmail: e.target.value})}
              required
              disabled={loading}
              pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
            />
          </div>

          <div className={styles.inputGroup}>
            <textarea
              placeholder="Escribe tu comentario... *"
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={4}
              required
              disabled={loading}
              minLength={5}
              maxLength={1000}
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={loading || !formData.userName || !formData.userEmail || !formData.content}
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
        </form>
      )}

      {/* Lista de comentarios */}
      <div className={styles.list}>
        {displayComments.map((comment) => (
          <div key={comment.id} className={`${styles.comment} ${!comment.approved ? styles.pending : ''}`}>
            <div className={styles.commentHeader}>
              <div className={styles.author}>
                <div className={styles.avatar}>
                  {getInitial(comment.userName)}
                </div>
                <div className={styles.authorInfo}>
                  <strong>{comment.userName}</strong>
                  <small>{comment.userEmail}</small>
                </div>
              </div>
              
              <div className={styles.commentActions}>
                <span className={styles.date}>
                  <i className="far fa-clock"></i> {formatDate(comment.createdAt)}
                </span>
                
                {!comment.approved && (
                  <span className={styles.pendingBadge}>
                    <i className="fas fa-clock"></i> Pendiente
                  </span>
                )}
                
                {isAdmin && (
                  <button 
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(comment.id)}
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
        ))}

        {displayComments.length === 0 && (
          <div className={styles.empty}>
            <i className="far fa-comment-dots"></i>
            <p>Sé el primero en comentar</p>
          </div>
        )}
      </div>
    </div>
  );
}