// app/blog/BlogLoading.tsx
export default function BlogLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header skeleton */}
      <div className="text-center mb-12">
        <div className="h-12 bg-gray-200 rounded-lg w-64 mx-auto mb-4 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded-lg w-96 mx-auto animate-pulse"></div>
      </div>
      
      {/* Search bar skeleton */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="h-14 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
      
      {/* Tags skeleton */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
        ))}
      </div>
      
      {/* Posts grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-6 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-lg mb-4 w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
          </div>
        ))}
      </div>
      
      {/* Sidebar skeleton (opcional) */}
      <div className="mt-8 lg:hidden">
        <div className="bg-gray-100 rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded-lg w-40 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}