'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Header.module.css';
import Cart from './Cart';
import { HiShoppingCart } from 'react-icons/hi2';
import { FaSearch } from 'react-icons/fa';
import { useCart } from '../context/CartContext';

const Header: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const { cartCount } = useCart();

  const toggleMenu = useCallback(() => {
    setMenuOpen(!menuOpen);
    if (menuOpen) {
      document.body.style.overflow = 'auto';
    } else {
      setSearchOpen(false);
      document.body.style.overflow = 'hidden';
    }
  }, [menuOpen]);

  const toggleSearch = useCallback(() => {
    setSearchOpen(!searchOpen);
    if (searchOpen) {
      document.body.style.overflow = 'auto';
    } else {
      setMenuOpen(false);
      document.body.style.overflow = 'hidden';
    }
  }, [searchOpen]);

  const toggleCart = useCallback(() => {
    setCartOpen(!cartOpen);
  }, [cartOpen]);

  const logoConfig = {
    src: '/images/logos/logver.svg',
    alt: 'A Marte - Pijamas para niños',
  };

  const LogoCohete = {
    src: '/images/logos/logCohete.svg',
    alt: 'A Marte Logo Cohete',
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (searchQuery.trim()) {
      router.push(`/menu?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
      document.body.style.overflow = 'auto';
    }
  }, [searchQuery, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        document.body.style.overflow = 'auto';
      }

      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        document.body.style.overflow = 'auto';
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    document.body.style.overflow = 'auto';
  }, [pathname]);

  const menuCategories = [
    {
      id: 'ninos',
      label: 'Niños',
      href: '/menu?category=ninos&type=SUPERIOR'
    },
    {
      id: 'ninas',
      label: 'Niñas',
      href: '/menu?category=ninas&type=SUPERIOR'
    },
    {
      id: 'unisex',
      label: 'Unisex',
      href: '/menu?gender=UNISEX&type=SUPERIOR'
    },
    {
      id: 'blog',
      label: 'Blog',
      href: '/blog'
    }
  ];

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
    document.body.style.overflow = 'auto';
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
    document.body.style.overflow = 'auto';
  }, []);

  return (
    <>
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.headerDecoration}></div>

        <div className={styles.headerContainer}>
          <Link href="/" className={styles.headerLogo} aria-label="Inicio - A Marte">
            <div className={styles.headerLogoWrapper}>
              <Image
                src={logoConfig.src}
                alt={logoConfig.alt}
                width={150}
                height={80}
                priority
                loading="eager"
                onLoad={() => setLogoLoaded(true)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '';
                }}
                className={`${styles.headerLogoImg} ${logoLoaded ? styles.headerLogoImgLoaded : ''}`}
              />
              {!logoLoaded && <div className={styles.headerLogoPlaceholder} />}
            </div>
          </Link>

          <nav className={styles.headerNav}>
            {menuCategories.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                className={`${styles.headerNavLink} ${cat.id === 'blog' ? styles.headerNavLinkBlog : ''}`}
              >
                {cat.label}
              </Link>
            ))}
            <Link href="/menu" className={`${styles.headerNavLink} ${styles.headerNavLinkAll}`}>
              Ver Todo
            </Link>
          </nav>

          <div className={styles.headerActions}>
            <button
              className={`${styles.headerActionBtn} ${styles.headerActionBtnSearch}`}
              onClick={toggleSearch}
              aria-label="Buscar"
            >
              <FaSearch size={22} />
            </button>

            <button
              className={`${styles.headerActionBtn} ${styles.headerActionBtnCart}`}
              onClick={toggleCart}
              aria-label="Carrito de compras"
            >
              <HiShoppingCart size={22} />
              {cartCount > 0 && (
                <span className={styles.headerCartBadge}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <button
              className={`${styles.headerActionBtn} ${styles.headerActionBtnMenu} ${menuOpen ? styles.headerActionBtnActive : ''}`}
              onClick={toggleMenu}
              aria-label="Menú"
            >
              <span className={styles.headerHamburger}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className={`${styles.searchPanel} ${searchOpen ? styles.searchPanelOpen : styles.searchPanelClosed}`} ref={searchRef}>
        <div className={styles.searchPanelHeader}>
          <h3 className={styles.searchPanelTitle}>
            <FaSearch size={18} />
            Buscar productos
          </h3>
          <button
            className={styles.searchPanelClose}
            onClick={handleCloseSearch}
            aria-label="Cerrar búsqueda"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className={styles.searchPanelForm}>
          <div className={styles.searchPanelInputWrapper}>
            <input
              type="text"
              className={styles.searchPanelInput}
              placeholder="Buscar pijamas, tallas, colores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus={searchOpen}
            />
            <button type="submit" className={styles.searchPanelSubmit}>
              Buscar
            </button>
          </div>
        </form>

        <div className={styles.searchPanelSuggestions}>
          <span className={styles.searchPanelSuggestionLabel}>Populares:</span>
          <div className={styles.searchPanelTags}>
            <Link href="/menu?search=astronauta" className={styles.searchPanelTag} onClick={handleCloseSearch}>Astronauta</Link>
            <Link href="/menu?search=estrellas" className={styles.searchPanelTag} onClick={handleCloseSearch}>Estrellas</Link>
            <Link href="/menu?search=cohete" className={styles.searchPanelTag} onClick={handleCloseSearch}>Cohete</Link>
            <Link href="/menu?search=planetas" className={styles.searchPanelTag} onClick={handleCloseSearch}>Planetas</Link>
          </div>
        </div>
      </div>

      <div className={`${styles.sideMenu} ${menuOpen ? styles.sideMenuOpen : styles.sideMenuClosed}`} ref={menuRef}>
        <div className={styles.sideMenuHeader}>
          <div className={styles.sideMenuBrand}>
            <div className={styles.sideMenuLogo}>
              <Image
                src={LogoCohete.src}
                alt={LogoCohete.alt}
                width={32}
                height={32}
                priority
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <span>A Marte</span>
          </div>
          <button
            className={styles.sideMenuClose}
            onClick={handleCloseMenu}
            aria-label="Cerrar menú"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={styles.sideMenuNav}>
          <div className={styles.sideMenuSection}>
            <div className={styles.sideMenuLinks}>
              {menuCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className={`${styles.sideMenuLink} ${cat.id === 'blog' ? styles.sideMenuLinkBlog : ''}`}
                  onClick={handleCloseMenu}
                >
                  <span className={styles.sideMenuLinkText}>{cat.label}</span>
                  <span className={styles.sideMenuLinkArrow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.sideMenuSection}>
            <Link href="/menu" className={styles.sideMenuCta} onClick={handleCloseMenu}>
              <span className={styles.sideMenuCtaText}>Ver Todo</span>
              <span className={styles.sideMenuCtaIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </Link>
          </div>
        </nav>
      </div>

      {(menuOpen || searchOpen) && (
        <div
          className={styles.headerOverlay}
          onClick={() => {
            setMenuOpen(false);
            setSearchOpen(false);
            document.body.style.overflow = 'auto';
          }}
        />
      )}

      <div className={styles.headerSpacer}></div>

      <Cart
        onClose={() => setCartOpen(false)}
        isOpen={cartOpen}
      />
    </>
  );
};

export default Header;