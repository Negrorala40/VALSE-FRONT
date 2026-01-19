'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Header.module.css';
import Cart from './Cart';
import { HiShoppingCart } from "react-icons/hi2";
import { FaSearch } from "react-icons/fa";

interface CartItem {
  id: string;
  image: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
}

interface HeaderProps {
  cartItems?: CartItem[];
  setCartItems?: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const Header: React.FC<HeaderProps> = ({ cartItems = [], setCartItems }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Estado local para el carrito si no viene de props
  const [localCartItems, setLocalCartItems] = useState<CartItem[]>(cartItems);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  // Función para manejar el setCartItems que pasa al Cart
  const handleSetCartItems = useRef<React.Dispatch<React.SetStateAction<CartItem[]>>>(
    setCartItems || setLocalCartItems
  );

  // Actualizar la referencia cuando cambian las props
  useEffect(() => {
    handleSetCartItems.current = setCartItems || setLocalCartItems;
  }, [setCartItems, setLocalCartItems]);

  // Actualizar localCartItems cuando cambian las props
  useEffect(() => {
    if (setCartItems && cartItems !== localCartItems) {
      setLocalCartItems(cartItems);
    }
  }, [cartItems, setCartItems, localCartItems]);

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

  // Logo configuration
  const logoConfig = {
    src: '/images/logos/logver.svg',
    alt: 'A Marte - Pijamas para niños',
  };
  const LogoCohete = {
    src: '/images/logos/logCohete.svg',
    alt: 'A Marte Logo Cohete',
  }

  // Scroll effect
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

  // Handle click outside para menú y búsqueda
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

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    document.body.style.overflow = 'auto';
  }, [pathname]);

  // Determinar qué cartItems mostrar
  const displayCartItems = setCartItems ? cartItems : localCartItems;
  const cartItemCount = displayCartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Categorías de menú - Cambiadas según lo requerido
  const menuCategories = [
    {
      id: 'ninos',
      label: 'Niños',
      href: '/menu?category=ninos&type=SUPERIOR' // ← Cambiado a category=ninos
    },
    {
      id: 'ninas',
      label: 'Niñas',
      href: '/menu?category=ninas&type=SUPERIOR' // ← Cambiado a category=ninas
    },
    {
      id: 'unisex',
      label: 'Unisex',
      href: '/menu?gender=UNISEX&type=SUPERIOR' // ← Se mantiene gender para Unisex
    },
    {
      id: 'blog',
      label: 'Blog',
      href: '/blog'
    }
  ];

  // Efecto para limpiar overflow cuando se desmonta
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
                src={logoConfig.src || "/images/logos/logver.svg"}
                alt={logoConfig.alt}
                width={150}
                height={80}
                priority={true}
                loading="eager"
                onLoad={() => setLogoLoaded(true)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/logos/logver.png';
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
              {cartItemCount > 0 && (
                <span className={styles.headerCartBadge}>{cartItemCount > 9 ? "9+" : cartItemCount}</span>
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
            <Link 
              href="/menu?search=astronauta" 
              className={styles.searchPanelTag}
              onClick={handleCloseSearch}
            >
              Astronauta
            </Link>
            <Link 
              href="/menu?search=estrellas" 
              className={styles.searchPanelTag}
              onClick={handleCloseSearch}
            >
              Estrellas
            </Link>
            <Link 
              href="/menu?search=cohete" 
              className={styles.searchPanelTag}
              onClick={handleCloseSearch}
            >
              Cohete
            </Link>
            <Link 
              href="/menu?search=planetas" 
              className={styles.searchPanelTag}
              onClick={handleCloseSearch}
            >
              Planetas
            </Link>
          </div>
        </div>
      </div>

      <div className={`${styles.sideMenu} ${menuOpen ? styles.sideMenuOpen : styles.sideMenuClosed}`} ref={menuRef}>
        <div className={styles.sideMenuHeader}>
          <div className={styles.sideMenuBrand}>
            <div className={styles.sideMenuLogo}>
              <Image
                src={LogoCohete.src || "/images/logos/logver.svg"}
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
            <Link 
              href="/menu" 
              className={styles.sideMenuCta} 
              onClick={handleCloseMenu}
            >
              <span className={styles.sideMenuCtaText}>Ver Todo</span>
              <span className={styles.sideMenuCtaIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </Link>
          </div>
        </nav>

        <div className={styles.sideMenuFooter}>
          <div className={styles.sideMenuContact}>
            <h5 className={styles.sideMenuContactTitle}>¿Necesitas ayuda?</h5>
            <a href="https://wa.me/573143853248" className={styles.sideMenuContactLink} target="_blank" rel="noopener noreferrer">
              <span className={styles.sideMenuContactIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </span>
              <span className={styles.sideMenuContactText}>Chatear por WhatsApp</span>
            </a>
          </div>
          
          <div className={styles.sideMenuSocial}>
            <span className={styles.sideMenuSocialTitle}>Síguenos</span>
            <div className={styles.sideMenuSocialLinks}>
              <a href="https://www.instagram.com/amartekids.co/" className={styles.sideMenuSocialLink} aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="18" cy="6" r="1" />
                </svg>
              </a>
              <a href="https://www.facebook.com/profile.php?id=100087160562926" className={styles.sideMenuSocialLink} aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              {/* <a href="#" className={styles.sideMenuSocialLink} aria-label="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3.045.6.088.9.13v-3.4a6.33 6.33 0 0 0-5.46 2.91 6.33 6.33 0 0 0 4.5 10.65 6.34 6.34 0 0 0 6.34-6.34V9.05a8.18 8.18 0 0 0 4.33 1.24v-3.6z"/>
                </svg>
              </a> */}
            </div>
          </div>
        </div>
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
        cartItems={displayCartItems}
        setCartItems={(items) => {
          handleSetCartItems.current(items);
        }}
        onClose={() => setCartOpen(false)}
        isOpen={cartOpen}
      />
    </>
  );
};

export default Header;