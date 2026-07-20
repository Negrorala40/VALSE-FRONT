'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from "next/image";
import {
  FaCcMastercard,
  FaCcVisa,
  FaCreditCard,
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaLock,
  FaShieldAlt,
  FaTimes,
  FaTruck,
  FaWhatsapp
} from 'react-icons/fa';
import { SiMercadopago } from 'react-icons/si';
import styles from './Footer.module.css';

type LegalKey =
  | 'terminos'
  | 'privacidad'
  | 'devoluciones'
  | 'garantias'
  | 'preguntas'
  | 'aviso';

interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  orderedItems?: string[];
}

interface LegalDocument {
  title: string;
  intro?: string;
  sections: LegalSection[];
}

interface FooterLinkItem {
  label: string;
  href: string;
}

interface FooterLinkColumnProps {
  title: string;
  links: FooterLinkItem[];
}

interface LegalModalProps {
  document: LegalDocument;
  onClose: () => void;
}

const CONTACT = {
  email: 'orbitaamarte@gmail.com',
  whatsappLabel: '+57 314 385 3248',
  whatsappUrl: 'https://wa.me/573143853248',
  instagramUrl: 'https://www.instagram.com/amartekids.co/',
  facebookUrl: 'https://www.facebook.com/profile.php?id=100087160562926'
} as const;

const shopLinks: FooterLinkItem[] = [
  { label: 'Todos los productos', href: '/menu' },
  { label: 'Niños', href: '/menu?category=ninos&type=SUPERIOR' },
  { label: 'Niñas', href: '/menu?category=ninas&type=SUPERIOR' },
  { label: 'Unisex', href: '/menu?gender=UNISEX&type=SUPERIOR' },
  { label: 'Ofertas', href: '/menu?filter=descuento' }
];

const exploreLinks: FooterLinkItem[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Catálogo', href: '/menu' },
  { label: 'Novedades', href: '/menu' },
  { label: 'Blog', href: '/blog' }
];

const legalDocuments: Record<LegalKey, LegalDocument> = {
  terminos: {
    title: 'Términos y condiciones',
    intro:
      'Estos términos regulan el acceso, navegación y compra de productos a través de la tienda online de VALSE.',
    sections: [
      {
        heading: '1. Uso del sitio',
        paragraphs: [
          'El sitio debe utilizarse de manera lícita y respetando los derechos de VALSE, sus usuarios y terceros.'
        ],
        bullets: [
          'No se permite intentar vulnerar la seguridad o disponibilidad de la plataforma.',
          'No se permite utilizar el contenido con fines fraudulentos.',
          'No se permite reproducir activos de marca sin autorización.'
        ]
      },
      {
        heading: '2. Productos y disponibilidad',
        paragraphs: [
          'Las fotografías buscan representar fielmente cada producto. Pueden existir variaciones menores de color según la pantalla, iluminación o lote de fabricación.',
          'La disponibilidad depende del inventario de cada talla, color y variante.'
        ]
      },
      {
        heading: '3. Precios y pagos',
        paragraphs: [
          'Los precios visibles se expresan en pesos colombianos cuando no se indique lo contrario. El valor final, los descuentos aplicables y los costos de envío se muestran antes de confirmar la compra.',
          'Los pagos son procesados mediante los proveedores habilitados en el checkout.'
        ]
      },
      {
        heading: '4. Envíos',
        paragraphs: [
          'Los tiempos de entrega son estimados y pueden variar según destino, disponibilidad, temporada y operador logístico.'
        ]
      }
    ]
  },
  privacidad: {
    title: 'Política de privacidad',
    intro:
      'VALSE utiliza la información personal únicamente para operar la tienda, atender solicitudes y mejorar la experiencia de compra.',
    sections: [
      {
        heading: '1. Información recopilada',
        bullets: [
          'Datos de identificación y contacto proporcionados durante la compra.',
          'Información necesaria para procesar pedidos, pagos y entregas.',
          'Datos técnicos y de navegación utilizados para seguridad y analítica.'
        ]
      },
      {
        heading: '2. Finalidades',
        bullets: [
          'Gestionar pedidos, devoluciones y solicitudes de soporte.',
          'Prevenir fraude y proteger la plataforma.',
          'Enviar comunicaciones comerciales únicamente cuando exista autorización.'
        ]
      },
      {
        heading: '3. Protección de la información',
        paragraphs: [
          'Se aplican medidas técnicas y organizativas razonables para reducir riesgos de acceso, alteración, pérdida o divulgación no autorizada.'
        ]
      },
      {
        heading: '4. Derechos del titular',
        paragraphs: [
          `Puedes solicitar consulta, actualización, corrección o eliminación de tus datos escribiendo a ${CONTACT.email}.`
        ]
      }
    ]
  },
  devoluciones: {
    title: 'Cambios y devoluciones',
    intro:
      'Las solicitudes se revisan de acuerdo con el estado del producto, la fecha de entrega y las condiciones informadas durante la compra.',
    sections: [
      {
        heading: '1. Condiciones generales',
        bullets: [
          'El producto debe conservar sus etiquetas, accesorios y empaque.',
          'No debe presentar señales de uso, lavado, modificación o daño atribuible al cliente.',
          'Debe incluirse el comprobante o número de pedido.'
        ]
      },
      {
        heading: '2. Solicitud',
        orderedItems: [
          'Comunícate con atención al cliente e indica el número de pedido.',
          'Describe el motivo y adjunta evidencias cuando sean necesarias.',
          'Espera la validación y las instrucciones de envío.',
          'El producto será inspeccionado antes de aprobar el cambio o reembolso.'
        ]
      },
      {
        heading: '3. Reembolsos',
        paragraphs: [
          'Cuando corresponda, el reembolso se procesa al mismo medio de pago o mediante el mecanismo acordado con el cliente. Los tiempos finales dependen de la entidad financiera.'
        ]
      }
    ]
  },
  garantias: {
    title: 'Garantías',
    intro:
      'La garantía cubre defectos de calidad o fabricación identificados dentro del período aplicable al producto.',
    sections: [
      {
        heading: '1. Cobertura',
        bullets: [
          'Defectos de fabricación.',
          'Fallas en costuras, cierres o ensambles atribuibles al proceso productivo.',
          'Problemas de material que no correspondan al desgaste normal.'
        ]
      },
      {
        heading: '2. Exclusiones',
        bullets: [
          'Desgaste normal por uso.',
          'Daños por lavado o cuidado contrario a las instrucciones.',
          'Accidentes, modificaciones o uso inadecuado.',
          'Daños ocasionados por almacenamiento incorrecto.'
        ]
      },
      {
        heading: '3. Cómo solicitarla',
        paragraphs: [
          'Conserva el comprobante de compra y contacta a soporte con fotografías claras y una descripción del caso.'
        ]
      }
    ]
  },
  preguntas: {
    title: 'Preguntas frecuentes',
    sections: [
      {
        heading: '¿Cuánto tarda un envío?',
        paragraphs: [
          'El tiempo depende de la ciudad y del operador logístico. La estimación se informa durante el checkout o después de confirmar el pedido.'
        ]
      },
      {
        heading: '¿Qué medios de pago están disponibles?',
        paragraphs: [
          'Los medios habilitados se muestran en el checkout y pueden incluir PSE, tarjetas y plataformas de pago digital.'
        ]
      },
      {
        heading: '¿Cómo elijo mi talla?',
        paragraphs: [
          'Consulta la guía asociada al producto y compara las medidas con una prenda similar. También puedes solicitar asesoría por WhatsApp.'
        ]
      },
      {
        heading: '¿Realizan envíos internacionales?',
        paragraphs: [
          'La cobertura actual debe confirmarse antes de finalizar la compra. Las opciones disponibles se muestran según la dirección ingresada.'
        ]
      }
    ]
  },
  aviso: {
    title: 'Aviso legal',
    sections: [
      {
        heading: '1. Identidad y actividad',
        paragraphs: [
          'VALSE es una marca de ropa deportiva orientada al movimiento, el rendimiento y el diseño funcional.'
        ]
      },
      {
        heading: '2. Propiedad intelectual',
        paragraphs: [
          'El nombre, identidad gráfica, fotografías, textos, interfaces y demás contenidos del sitio están protegidos por la normativa aplicable y no pueden utilizarse sin autorización.'
        ]
      },
      {
        heading: '3. Responsabilidad',
        paragraphs: [
          'VALSE procura mantener la información disponible y actualizada, sin garantizar que el servicio esté libre de interrupciones temporales, errores técnicos o eventos fuera de su control.'
        ]
      },
      {
        heading: '4. Legislación aplicable',
        paragraphs: [
          'Las relaciones derivadas del uso de la tienda se interpretan conforme a la legislación de la República de Colombia.'
        ]
      }
    ]
  }
};

const legalLinks: Array<{ key: LegalKey; label: string }> = [
  { key: 'terminos', label: 'Términos' },
  { key: 'privacidad', label: 'Privacidad' },
  { key: 'devoluciones', label: 'Devoluciones' },
  { key: 'garantias', label: 'Garantías' },
  { key: 'preguntas', label: 'FAQ' },
  { key: 'aviso', label: 'Aviso legal' }
];

const serviceItems = [
  {
    icon: <FaLock aria-hidden="true" />,
    title: 'Pago protegido',
    description: 'Procesamiento mediante proveedores habilitados.'
  },
  {
    icon: <FaTruck aria-hidden="true" />,
    title: 'Envíos en Colombia',
    description: 'Cobertura sujeta al destino y operador logístico.'
  },
  {
    icon: <FaShieldAlt aria-hidden="true" />,
    title: 'Compra con respaldo',
    description: 'Soporte para cambios, garantías y pedidos.'
  },
  {
    icon: <FaCreditCard aria-hidden="true" />,
    title: 'Múltiples medios',
    description: 'Opciones disponibles directamente en el checkout.'
  }
];

const paymentMethods: Array<{ label: string; icon: ReactNode }> = [
  { label: 'PSE', icon: <span className={styles.pseWordmark}>PSE</span> },
  { label: 'Mastercard', icon: <FaCcMastercard aria-hidden="true" /> },
  { label: 'Visa', icon: <FaCcVisa aria-hidden="true" /> },
  { label: 'Mercado Pago', icon: <SiMercadopago aria-hidden="true" /> }
];

const ValseMark = () => (
  <svg
    className={styles.brandMark}
    viewBox="0 0 120 96"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M6 8 45 35l12 25-18-8L23 36Z" />
    <path d="m114 8-39 27-12 25 18-8 16-16Z" />
    <path d="m50 35 10 16 10-16Z" />
    <path d="m34 43 18 17v28L43 66Z" />
    <path d="M86 43 68 60v28l9-22Z" />
  </svg>
);

const FooterLinkColumn = ({ title, links }: FooterLinkColumnProps) => (
  <nav className={styles.linkColumn} aria-label={title}>
    <h3 className={styles.columnTitle}>{title}</h3>
    <ul className={styles.linkList}>
      {links.map((link) => (
        <li key={`${title}-${link.label}`}>
          <Link href={link.href} className={styles.footerLink}>
            <span>{link.label}</span>
            <span className={styles.linkArrow} aria-hidden="true">
              ↗
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

const LegalModal = ({ document, onClose }: LegalModalProps) => {
  const titleId = useId();

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modalContent}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className={styles.modalHeader}>
          <div>
            <span className={styles.modalEyebrow}>VALSE / LEGAL</span>
            <h2 id={titleId}>{document.title}</h2>
          </div>

          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Cerrar ventana"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          {document.intro && <p className={styles.modalIntro}>{document.intro}</p>}

          {document.sections.map((section) => (
            <section className={styles.legalDocumentSection} key={section.heading}>
              <h3>{section.heading}</h3>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {section.bullets && (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {section.orderedItems && (
                <ol>
                  {section.orderedItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" className={styles.modalSecondaryBtn} onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className={styles.modalPrimaryBtn}
            onClick={() => window.print()}
          >
            Imprimir
          </button>
        </footer>
      </section>
    </div>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [activeModal, setActiveModal] = useState<LegalKey | null>(null);

  useEffect(() => {
    if (!activeModal) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveModal(null);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModal]);

  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.footerWatermark} aria-hidden="true">
          VALSE
        </div>

        <div className={styles.footerShell}>
          <section className={styles.footerIntro}>
            <div className={styles.brandBlock}>
            <Link href="/" className={styles.brandLockup} aria-label="Ir al inicio de VALSE">
            <Image 
                  src="/images/logos/logLog.svg"
                  alt="A MARTE Logo"
                  width={80}
                  height={80}
                  className={styles.brandLogo}
                  priority={false}
                />
                <span className={styles.brandName}>VALSE</span>
              </Link>

              <span className={styles.brandEyebrow}>MOVE WITH PURPOSE</span>

              <h2 className={styles.brandStatement}>
                Diseñado para el movimiento.
                <br />
                Construido con intención.
              </h2>

              <p className={styles.brandDescription}>
                Ropa deportiva funcional con una dirección limpia, precisa y contemporánea.
              </p>
            </div>

            <div className={styles.socialBlock}>
              <span className={styles.socialLabel}>Sigue el movimiento</span>

              <div className={styles.socialLinks}>
                <a
                  href={CONTACT.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.socialLink}
                  aria-label="Instagram de VALSE"
                >
                  <FaInstagram aria-hidden="true" />
                  <span>Instagram</span>
                </a>

                <a
                  href={CONTACT.facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.socialLink}
                  aria-label="Facebook de VALSE"
                >
                  <FaFacebookF aria-hidden="true" />
                  <span>Facebook</span>
                </a>

                <a
                  href={CONTACT.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.socialLink}
                  aria-label="WhatsApp de VALSE"
                >
                  <FaWhatsapp aria-hidden="true" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </section>

          <div className={styles.footerRule} />

          <section className={styles.footerGrid}>
            <FooterLinkColumn title="Comprar" links={shopLinks} />
            <FooterLinkColumn title="Explorar" links={exploreLinks} />

            <address className={styles.contactColumn}>
              <h3 className={styles.columnTitle}>Contacto</h3>

              <a className={styles.contactLink} href={`mailto:${CONTACT.email}`}>
                <FaEnvelope aria-hidden="true" />
                <span>
                  <small>Información y soporte</small>
                  {CONTACT.email}
                </span>
              </a>

              <a
                className={styles.contactLink}
                href={CONTACT.whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FaWhatsapp aria-hidden="true" />
                <span>
                  <small>Asesoría por WhatsApp</small>
                  {CONTACT.whatsappLabel}
                </span>
              </a>
            </address>

            <div className={styles.manifestoColumn}>
              <h3 className={styles.columnTitle}>VALSE</h3>
              <p>
                Movimiento, disciplina, rendimiento y elegancia dentro de un sistema visual
                esencial.
              </p>
              <Link href="/menu" className={styles.catalogCta}>
                Explorar catálogo
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>

          <section className={styles.serviceStrip} aria-label="Beneficios de compra">
            {serviceItems.map((item) => (
              <article className={styles.serviceItem} key={item.title}>
                <span className={styles.serviceIcon}>{item.icon}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.footerBottom}>
            <div className={styles.paymentBlock}>
              <span className={styles.paymentLabel}>Métodos de pago</span>
              <div className={styles.paymentIcons}>
                {paymentMethods.map((method) => (
                  <span
                    className={styles.paymentIcon}
                    key={method.label}
                    title={method.label}
                    aria-label={method.label}
                  >
                    {method.icon}
                  </span>
                ))}
              </div>
            </div>

            <nav className={styles.legalLinks} aria-label="Información legal">
              {legalLinks.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={styles.legalLink}
                  onClick={() => setActiveModal(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <p className={styles.copyright}>
              © {currentYear} VALSE. Colombia.
            </p>
          </section>
        </div>
      </footer>

      {activeModal && (
        <LegalModal
          document={legalDocuments[activeModal]}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
};

export default Footer;