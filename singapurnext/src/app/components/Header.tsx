'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Header.module.css';
import Cart from './Cart';
import { HiShoppingCart } from "react-icons/hi2";
import { FaUserAstronaut } from "react-icons/fa6";
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
  }, [setCartItems]);

  // Actualizar localCartItems cuando cambian las props
  useEffect(() => {
    if (setCartItems && cartItems !== localCartItems) {
      setLocalCartItems(cartItems);
    }
  }, [cartItems, setCartItems]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    if (menuOpen) {
      document.body.style.overflow = 'auto';
    } else {
      setSearchOpen(false);
      document.body.style.overflow = 'hidden';
    }
  };

  const toggleSearch = () => {
    setSearchOpen(!searchOpen);
    if (searchOpen) {
      document.body.style.overflow = 'auto';
    } else {
      setMenuOpen(false);
      document.body.style.overflow = 'hidden';
    }
  };

  const toggleCart = () => {
    setCartOpen(!cartOpen);
  };

  // Logo configuration
  const logoConfig = {
    src: '/images/logos/logver.svg',
    alt: 'A Marte - Pijamas para niños',
  };

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/menu?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
      document.body.style.overflow = 'auto';
    }
  };

  /* COMENTADO: Botón de perfil desactivado
  const handleUserClick = () => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/perfil');
    } else {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  };
  */

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

  // Cambiado: Solo categorías principales, sin submenús
  const menuCategories = [
    {
      id: 'ninos',
      label: 'Niños',
      href: '/menu?gender=NIÑOS&type=SUPERIOR', // URL directa
    },
    {
      id: 'ninas',
      label: 'Niñas',
      href: '/menu?gender=NIÑAS&type=SUPERIOR', // URL directa
    },
    {
      id: 'unisex',
      label: 'Unisex',
      href: '/menu?gender=UNISEX&type=SUPERIOR', // URL directa
    },
  ];

  // Efecto para limpiar overflow cuando se desmonta
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <>
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
        {/* Decorative top bar */}
        <div className={styles.headerDecoration}></div>

        <div className={styles.headerContainer}>
          {/* Logo - Left side - CON MÁRGEN VERTICAL */}
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

          {/* Navigation - Desktop - SIN SUBMENÚS */}
          <nav className={styles.headerNav}>
            {menuCategories.map((cat) => (
              <Link 
                key={cat.id} 
                href={cat.href}
                className={styles.headerNavLink}
              >
                {cat.label}
              </Link>
            ))}
            <Link href="/menu" className={`${styles.headerNavLink} ${styles.headerNavLinkAll}`}>
              Ver Todo
            </Link>
          </nav>

          {/* Actions - Right side */}
          <div className={styles.headerActions}>
            {/* Search */}
            <button
              className={`${styles.headerActionBtn} ${styles.headerActionBtnSearch}`}
              onClick={toggleSearch}
              aria-label="Buscar"
            >
              <FaSearch size={22} />
            </button>

            {/* User - COMENTADO: Botón deshabilitado */}
            {/*
            <button
              className={`${styles.headerActionBtn} ${styles.headerActionBtnUser} ${isLoggedIn ? styles.headerActionBtnLogged : ''}`}
              onClick={handleUserClick}
              aria-label={isLoggedIn ? "Ver perfil" : "Iniciar sesión"}
            >
              <FaUserAstronaut size={22} />
              {isLoggedIn && <span className={styles.headerStatusDot}></span>}
            </button>
            */}

            {/* Cart */}
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

            {/* Mobile menu toggle */}
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

            {/* Search Panel - CORREGIDO: Opacidad */}
      <div className={`${styles.searchPanel} ${searchOpen ? styles.searchPanelOpen : styles.searchPanelClosed}`} ref={searchRef}>
        <div className={styles.searchPanelHeader}>
          <h3 className={styles.searchPanelTitle}>
            <FaSearch size={18} />
            Buscar productos
          </h3>
          <button 
            className={styles.searchPanelClose} 
            onClick={() => {
              setSearchOpen(false);
              document.body.style.overflow = 'auto';
            }}
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
              onClick={() => {
                setSearchOpen(false);
                document.body.style.overflow = 'auto';
              }}
            >
              Astronauta
            </Link>
            <Link 
              href="/menu?search=estrellas" 
              className={styles.searchPanelTag}
              onClick={() => {
                setSearchOpen(false);
                document.body.style.overflow = 'auto';
              }}
            >
              Estrellas
            </Link>
            <Link 
              href="/menu?search=cohete" 
              className={styles.searchPanelTag}
              onClick={() => {
                setSearchOpen(false);
                document.body.style.overflow = 'auto';
              }}
            >
              Cohete
            </Link>
            <Link 
              href="/menu?search=planetas" 
              className={styles.searchPanelTag}
              onClick={() => {
                setSearchOpen(false);
                document.body.style.overflow = 'auto';
              }}
            >
              Planetas
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Side Menu - CORREGIDO: Opacidad */}
      <div className={`${styles.sideMenu} ${menuOpen ? styles.sideMenuOpen : styles.sideMenuClosed}`} ref={menuRef}>
        <div className={styles.sideMenuHeader}>
          <div className={styles.sideMenuBrand}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a7 7 0 0 0 0 14" />
            </svg>
            <span>A Marte</span>
          </div>
          <button 
            className={styles.sideMenuClose} 
            onClick={() => {
              setMenuOpen(false);
              document.body.style.overflow = 'auto';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={styles.sideMenuNav}>
          {menuCategories.map((cat) => (
            <div key={cat.id} className={styles.sideMenuCategory}>
              <Link 
                href={cat.href} 
                className={styles.sideMenuLink}
                onClick={() => {
                  setMenuOpen(false);
                  document.body.style.overflow = 'auto';
                }}
              >
                <span className={styles.sideMenuCategoryIcon}>
                  {cat.id === 'ninos' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    </svg>
                  )}
                  {cat.id === 'ninas' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                    </svg>
                  )}
                  {cat.id === 'unisex' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                </span>
                <span>{cat.label}</span>
              </Link>
            </div>
          ))}
        </nav>

        <div className={styles.sideMenuFooter}>
          <Link 
            href="/menu" 
            className={styles.sideMenuCta} 
            onClick={() => {
              setMenuOpen(false);
              document.body.style.overflow = 'auto';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Ver todo el catálogo
          </Link>
          <div className={styles.sideMenuSocial}>
            <a href="#" className={styles.sideMenuSocialLink} aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="18" cy="6" r="1" />
              </svg>
            </a>
            <a href="#" className={styles.sideMenuSocialLink} aria-label="WhatsApp">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Overlay - SOLO cuando hay menú o búsqueda abiertos - FIXED */}
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

      {/* Spacer for fixed header */}
      <div className={styles.headerSpacer}></div>

      {/* Cart Component */}
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