'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/orders.module.css';

interface SearchBarProps {
  initialValue?: string;
}

export default function SearchBar({ initialValue = '' }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/orden/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    router.push('/orden');
  };

  return (
    <form onSubmit={handleSearch} className={styles.searchForm}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por email, ID de orden..."
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          🔍
        </button>
        {searchTerm && (
          <button 
            type="button" 
            onClick={handleClear}
            className={styles.clearButton}
          >
            ✕
          </button>
        )}
      </div>
    </form>
  );
}