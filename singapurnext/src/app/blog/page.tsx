// app/blog/page.tsx
import { Suspense } from 'react';
import BlogListPage from './BlogListPage';
import BlogLoading from './BlogLoading';

export const metadata = {
  title: 'Blog | Singapur Next',
  description: 'Descubre artículos sobre moda, estilo y tendencias.',
};

export default function BlogPage() {
  return (
    <Suspense fallback={<BlogLoading />}>
      <BlogListPage />
    </Suspense>
  );
}