// src/app/orden/search/SearchContent.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '../components/SearchBar';
import OrderList from '../components/OrderList';
import styles from '../styles/orders.module.css';

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchTerm = searchParams.get('q') || '';

  const handleOrderClick = (orderId: number) => {
    router.push(`/orden/${orderId}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button 
          onClick={() => router.push('/orden')}
          className={styles.backButton}
        >
          ← Volver
        </button>
        <h1>Buscar Órdenes</h1>
      </header>

      <div className={styles.searchSection}>
        <SearchBar initialValue={searchTerm} />
      </div>

      <main className={styles.main}>
        {searchTerm ? (
          <>
            <h2 className={styles.searchTitle}>
              Resultados para: "{searchTerm}"
            </h2>
            <OrderList
              searchTerm={searchTerm}
              onOrderClick={handleOrderClick}
            />
          </>
        ) : (
          <div className={styles.emptySearch}>
            <p>Ingresa un término de búsqueda</p>
          </div>
        )}
      </main>
    </div>
  );
}