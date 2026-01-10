import BlogDetail from '@/app/components/BlogDetail/BlogDetail';
import type { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
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
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${API_URL}/api/blog/slug/${params.slug}`, {
      next: { revalidate: 3600 } // Cache por 1 hora
    });
    
    if (!response.ok) {
      return {
        title: 'Artículo no encontrado | Singapur Next',
        description: 'El blog post que buscas no está disponible.'
      };
    }
    
    const post = await response.json();
    
    return {
      title: post.metaTitle || `${post.title} | Singapur Next Blog`,
      description: post.metaDescription || post.excerpt || post.content.substring(0, 160),
      openGraph: {
        title: post.metaTitle || post.title,
        description: post.metaDescription || post.excerpt || post.content.substring(0, 160),
        images: post.featuredImageUrl ? [post.featuredImageUrl] : [],
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
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${API_URL}/api/blog?size=100`);
    
    if (!response.ok) {
      console.error('Error fetching posts for static generation');
      return [];
    }
    
    const data = await response.json();
    const posts = data.content || data || [];
    
    return posts.map((post: any) => ({
      slug: post.slug || post.id.toString(),
    }));
  } catch (error) {
    console.error('Error in generateStaticParams:', error);
    return [];
  }
}