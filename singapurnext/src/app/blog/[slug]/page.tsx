import BlogDetail from '@/app/components/BlogDetail/BlogDetail';
import type { Metadata } from 'next';
import { BLOG_POSTS, BLOG_POST_BY_SLUG } from '@/app/utils/Api'; // <-- Importa BLOG_POST_BY_SLUG

// Definición de tipos
interface PageProps {
  params: {
    slug: string;
  };
}

interface BlogPost {
  id: number | string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImageUrl?: string;
  publicationDate?: string;
  authorName?: string;
}

interface BlogListResponse {
  content?: BlogPost[];
  pageable?: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements?: number;
  totalPages?: number;
  last?: boolean;
}

export default function BlogDetailPage({ params }: PageProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BlogDetail slug={params.slug} />
    </div>
  );
}

// Metadata dinámica para SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const response = await fetch(BLOG_POST_BY_SLUG(params.slug), { // <-- Usa la constante aquí
      next: { revalidate: 3600 } // Cache por 1 hora
    });
    
    if (!response.ok) {
      return {
        title: 'Artículo no encontrado | Singapur Next',
        description: 'El blog post que buscas no está disponible.'
      };
    }
    
    const post: BlogPost = await response.json();
    
    // Extraer contenido para descripción
    const descriptionContent = post.metaDescription || post.excerpt || 
      (post.content ? post.content.substring(0, 160) : '');
    
    // Configurar imágenes para OpenGraph
    const openGraphImages = post.featuredImageUrl ? [post.featuredImageUrl] : [];
    
    return {
      title: post.metaTitle || `${post.title} | Singapur Next Blog`,
      description: descriptionContent,
      openGraph: {
        title: post.metaTitle || post.title,
        description: descriptionContent,
        images: openGraphImages,
        type: 'article',
        publishedTime: post.publicationDate,
        authors: [post.authorName || 'Singapur Next'],
      },
    };
  } catch {
    return {
      title: 'Blog | Singapur Next',
      description: 'Descubre artículos sobre moda, estilo y tendencias.'
    };
  }
}

// Generar páginas estáticas (opcional)
export async function generateStaticParams() {
  try {
    const response = await fetch(`${BLOG_POSTS}?size=100`, {
      next: { revalidate: 3600 } // Cache por 1 hora
    });
    
    if (!response.ok) {
      console.error('Error fetching posts for static generation');
      return [];
    }
    
    const data: BlogListResponse = await response.json();
    const posts: BlogPost[] = data.content || [];
    
    return posts.map((post: BlogPost) => ({
      slug: post.slug || post.id.toString(),
    }));
  } catch (error) {
    console.error('Error in generateStaticParams:', error);
    return [];
  }
}