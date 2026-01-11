// app/blog/[slug]/page.tsx
import BlogDetail from '@/app/components/BlogDetail/BlogDetail';
import type { Metadata } from 'next';
import { BLOG_POSTS, BLOG_POST_BY_SLUG } from '@/app/utils/Api';

// Definición de tipos CORREGIDA para Next.js 15
interface PageProps {
  params: Promise<{
    slug: string;
  }>;
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

// Componente principal CORREGIDO
export default async function BlogDetailPage(props: PageProps) {
  // Extraer params de la Promise
  const params = await props.params;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BlogDetail slug={params.slug} />
    </div>
  );
}

// Metadata dinámica CORREGIDA
export async function generateMetadata(props: PageProps): Promise<Metadata> {
  // Extraer params de la Promise
  const params = await props.params;
  
  try {
    const response = await fetch(BLOG_POST_BY_SLUG(params.slug), {
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      return {
        title: 'Artículo no encontrado | Singapur Next',
        description: 'El blog post que buscas no está disponible.'
      };
    }
    
    const post: BlogPost = await response.json();
    
    const descriptionContent = post.metaDescription || post.excerpt || 
      (post.content ? post.content.substring(0, 160) : '');
    
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

// Generar páginas estáticas CORREGIDA
export async function generateStaticParams() {
  try {
    const response = await fetch(`${BLOG_POSTS}?size=100`, {
      next: { revalidate: 3600 }
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