'use client';

import { useState } from "react";
import Image from "next/image";
import styles from "./Footer.module.css";
import { 
  FaFacebook, 
  FaInstagram, 
  FaWhatsapp,
  FaEnvelope,
  FaHeadset,
  FaShieldAlt,
  FaTruck,
  FaCreditCard,
  FaTimes,
  FaCcVisa,
  FaCcMastercard,
  FaApple,
  FaLock
} from "react-icons/fa";
import { SiMercadopago } from "react-icons/si";

// Componente personalizado para PSE
const PseIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    width="1em" 
    height="1em" 
    className={styles.paymentSvg}
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
    <text x="6" y="18" fontSize="8" fontWeight="bold" fill="currentColor">PSE</text>
  </svg>
);

interface LegalContent {
  title: string;
  content: string;
}

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = "auto";
  };

  const legalContent: Record<string, LegalContent> = {
    terminos: {
      title: "Términos y Condiciones",
      content: `
        <h3>1. ACEPTACIÓN DE TÉRMINOS</h3>
        <p>Al acceder y utilizar este sitio web, usted acepta estar sujeto a estos términos y condiciones de uso, todas las leyes y regulaciones aplicables, y acepta que es responsable del cumplimiento de las leyes locales aplicables.</p>
        
        <h3>2. USO DEL SITIO</h3>
        <p>Está autorizado a utilizar nuestro sitio web para fines legítimos. No puede utilizar este sitio de manera que:</p>
        <ul>
          <li>Viole cualquier ley o regulación local, nacional o internacional</li>
          <li>Infrinja los derechos de propiedad intelectual de terceros</li>
          <li>Sea fraudulenta o tenga propósito fraudulento</li>
          <li>Transmita virus o cualquier otro código malicioso</li>
        </ul>
        
        <h3>3. PRODUCTOS Y PRECIOS</h3>
        <p>Nos reservamos el derecho de modificar los precios de los productos en cualquier momento sin previo aviso. Los precios mostrados son en dólares americanos (USD) e incluyen IVA cuando corresponda.</p>
        
        <h3>4. PAGOS</h3>
        <p>Aceptamos los métodos de pago indicados en nuestro sitio. Todas las transacciones son procesadas de forma segura a través de pasarelas de pago certificadas.</p>
        
        <h3>5. ENVÍOS</h3>
        <p>Realizamos envíos a todo Colombia. Los tiempos de entrega varían según la ubicación y el transportista seleccionado.</p>
      `,
    },
    privacidad: {
      title: "Política de Privacidad",
      content: `
        <h3>1. INFORMACIÓN QUE RECOPILAMOS</h3>
        <p>Recopilamos información personal que usted nos proporciona voluntariamente al:</p>
        <ul>
          <li>Registrarse en nuestra tienda</li>
          <li>Realizar una compra</li>
          <li>Suscribirse a nuestro newsletter</li>
          <li>Contactarnos por cualquier medio</li>
        </ul>
        
        <h3>2. USO DE LA INFORMACIÓN</h3>
        <p>Utilizamos su información personal para:</p>
        <ul>
          <li>Procesar sus pedidos y gestionar su cuenta</li>
          <li>Enviar información sobre productos y ofertas (si nos ha dado su consentimiento)</li>
          <li>Mejorar nuestros productos y servicios</li>
          <li>Prevenir fraudes y actividades ilegales</li>
        </ul>
        
        <h3>3. PROTECCIÓN DE DATOS</h3>
        <p>Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos personales contra accesos no autorizados, alteración, divulgación o destrucción.</p>
        
        <h3>4. DERECHOS DEL USUARIO</h3>
        <p>Usted tiene derecho a acceder, rectificar y eliminar sus datos personales. Para ejercer estos derechos, contáctenos a info@amarte.com</p>
      `,
    },
    devoluciones: {
      title: "Política de Devoluciones",
      content: `
        <h3>1. PLAZO PARA DEVOLUCIONES</h3>
        <p>Aceptamos devoluciones dentro de los 15 días posteriores a la recepción del producto. El producto debe estar en su estado original, sin usar y con todos los accesorios y empaques originales.</p>
        
        <h3>2. CONDICIONES PARA DEVOLUCIÓN</h3>
        <p>Para ser elegible para una devolución:</p>
        <ul>
          <li>El producto debe estar en su estado original</li>
          <li>Debe incluir la factura o comprobante de compra</li>
          <li>Debe estar en su empaque original sin daños</li>
          <li>No deben haber transcurrido más de 15 días desde la compra</li>
        </ul>
        
        <h3>3. PROCESO DE DEVOLUCIÓN</h3>
        <p>Para iniciar una devolución:</p>
        <ol>
          <li>Contacte a nuestro servicio al cliente</li>
          <li>Proporcione el número de orden y detalles del producto</li>
          <li>Recibirá instrucciones para el envío de retorno</li>
          <li>Una vez recibido y verificado el producto, procesaremos el reembolso</li>
        </ol>
        
        <h3>4. REEMBOLSOS</h3>
        <p>Los reembolsos se procesarán dentro de los 5-7 días hábiles después de recibir y verificar el producto devuelto.</p>
      `,
    },
    garantias: {
      title: "Garantías",
      content: `
        <h3>1. PERÍODO DE GARANTÍA</h3>
        <p>Todos nuestros productos cuentan con una garantía del fabricante que varía según el producto:</p>
        <ul>
          <li>Pijamas y ropa infantil: 3 meses</li>
          <li>Accesorios y complementos: 2 meses</li>
          <li>Productos especiales: Consultar garantía específica</li>
        </ul>
        
        <h3>2. COBERTURA DE GARANTÍA</h3>
        <p>La garantía cubre defectos de fabricación, fallos en costuras y problemas de calidad en los materiales.</p>
        <p>La garantía NO cubre:</p>
        <ul>
          <li>Daños por uso inadecuado</li>
          <li>Desgaste normal</li>
          <li>Daños por lavado incorrecto</li>
          <li>Modificaciones al producto</li>
        </ul>
        
        <h3>3. ACTIVACIÓN DE GARANTÍA</h3>
        <p>Para activar la garantía, conserve la factura de compra original y mantenga el producto en su empaque original.</p>
      `,
    },
    preguntas: {
      title: "Preguntas Frecuentes",
      content: `
        <h3>1. ¿Cuánto tardan los envíos?</h3>
        <p>Los tiempos de envío varían según la ubicación:</p>
        <ul>
          <li>Bogotá, Medellín, Cali: 1-2 días hábiles</li>
          <li>Otras ciudades principales: 2-4 días hábiles</li>
          <li>Municipios y zonas rurales: 4-7 días hábiles</li>
        </ul>
        
        <h3>2. ¿Qué métodos de pago aceptan?</h3>
        <p>Aceptamos:</p>
        <ul>
          <li>Tarjetas de crédito/débito (Visa, Mastercard, Amex)</li>
          <li>Transferencias bancarias</li>
          <li>Nequi y Daviplata</li>
          <li>Contraentrega en ciudades principales</li>
        </ul>
        
        <h3>3. ¿Cómo sé mi talla?</h3>
        <p>Disponemos de una guía de tallas detallada en cada producto. Si tienes dudas, contáctanos por WhatsApp para asesoría personalizada.</p>
        
        <h3>4. ¿Hacen envíos internacionales?</h3>
        <p>Actualmente solo realizamos envíos dentro de Colombia.</p>
      `,
    },
    aviso: {
      title: "Aviso Legal",
      content: `
        <h3>1. INFORMACIÓN GENERAL</h3>
        <p><strong>A MARTE</strong> es una empresa colombiana dedicada a la venta de pijamas infantiles de alta calidad.</p>
        
        <h3>2. PROPIEDAD INTELECTUAL</h3>
        <p>Todos los contenidos de este sitio web, incluyendo textos, gráficos, logotipos, imágenes, y software, son propiedad de A MARTE o de sus proveedores de contenidos y están protegidos por las leyes de propiedad intelectual.</p>
        
        <h3>3. LIMITACIÓN DE RESPONSABILIDAD</h3>
        <p>A MARTE no será responsable por daños indirectos, incidentales o consecuentes que resulten del uso o la imposibilidad de uso de los productos o servicios.</p>
        
        <h3>4. LEY APLICABLE</h3>
        <p>Estos términos se regirán e interpretarán de acuerdo con las leyes de la República de Colombia.</p>
        
        <h3>5. MODIFICACIONES</h3>
        <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web.</p>
      `,
    }
  };

  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          {/* Column 1: Brand - Apple Style */}
          <div className={styles.footerColumn}>
            <div className={styles.logoWrapper}>
              <div className={styles.logoGlow}></div>
              <div className={styles.logoContainer}>
                <Image 
                  src="/images/logos/logverWhite.svg"
                  alt="A MARTE Logo"
                  width={140}
                  height={140}
                  className={styles.brandLogo}
                  priority={false}
                />
              </div>
            </div>
            <p className={styles.brandTagline}>Nos inspira su amor, su protección, su comodidad y su libertad para explorar.</p>
            <p className={styles.brandDescription}>
              Pijamas pensadas para soñar, moverse y explorar sin límites.
            </p>
            <div className={styles.socialSection}>
              <a href="https://www.facebook.com/profile.php?id=100087160562926" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                <FaFacebook />
              </a>
              <a href="https://www.instagram.com/amartekids.co/" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                <FaInstagram />
              </a>
              <a href="https://wa.me/573143853248" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                <FaWhatsapp />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerTitle}>Enlaces</h4>
            <ul className={styles.footerLinks}>
              <li>
                <a href="/">Inicio</a>
              </li>
              <li>
                <a href="/menu">Productos</a>
              </li>
              <li>
                <a href="/home">Categorías</a>
              </li>
              <li>
                <a href="/menu">Novedades</a>
              </li>
              <li>
                <a href="/">Ofertas</a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerTitle}>Contacto</h4>
            <div className={styles.contactItems}>
              <div className={styles.contactItem}>
                <FaWhatsapp className={styles.contactIcon} />
                <div>
                  <span className={styles.contactText}>+57 3143853248</span>
                  <span className={styles.contactLabel}>WhatsApp</span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <FaEnvelope className={styles.contactIcon} />
                <div>
                  <span className={styles.contactText}>orbitaamarte@gmail.com</span>
                  <span className={styles.contactLabel}>Información</span>
                </div>
              </div>
              <div className={styles.contactItem}>
                <FaHeadset className={styles.contactIcon} />
                <div>
                  <span className={styles.contactText}>orbitaamarte@gmail.com</span>
                  <span className={styles.contactLabel}>Soporte</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Services */}
          <div className={styles.footerColumn}>
            <h4 className={styles.footerTitle}>Servicios</h4>
            <div className={styles.servicesList}>
              <div className={styles.serviceItem}>
                <FaLock className={styles.serviceIcon} />
                <span>Compra 100% Segura</span>
              </div>
              <div className={styles.serviceItem}>
                <FaTruck className={styles.serviceIcon} />
                <span>Envíos a todo Colombia</span>
              </div>
              <div className={styles.serviceItem}>
                <FaCreditCard className={styles.serviceIcon} />
                <span>Múltiples pagos</span>
              </div>
              <div className={styles.serviceItem}>
                {/* <FaApple className={styles.serviceIcon} />
                <span>Diseño Apple Style</span> */}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Apple Style */}
        <div className={styles.footerBottom}>
          <div className={styles.bottomContent}>
            {/* Payment Methods */}
            <div className={styles.paymentMethods}>
              <span className={styles.paymentTitle}>Métodos de pago</span>
              <div className={styles.paymentIcons}>
                <div className={styles.paymentIconWrapper} title="PSE">
                  <PseIcon />
                </div>
                <div className={styles.paymentIconWrapper} title="Mastercard">
                  <FaCcMastercard />
                </div>
                <div className={styles.paymentIconWrapper} title="Visa">
                  <FaCcVisa />
                </div>
                <div className={styles.paymentIconWrapper} title="Mercado Pago">
                  <SiMercadopago />
                </div>
              </div>
            </div>

            {/* Legal Links */}
            <div className={styles.legalSection}>
              <button className={styles.legalLink} onClick={() => openModal("terminos")}>
                Términos
              </button>
              <span className={styles.separator}>•</span>
              <button className={styles.legalLink} onClick={() => openModal("privacidad")}>
                Privacidad
              </button>
              <span className={styles.separator}>•</span>
              <button className={styles.legalLink} onClick={() => openModal("devoluciones")}>
                Devoluciones
              </button>
              <span className={styles.separator}>•</span>
              <button className={styles.legalLink} onClick={() => openModal("garantias")}>
                Garantías
              </button>
              <span className={styles.separator}>•</span>
              <button className={styles.legalLink} onClick={() => openModal("preguntas")}>
                FAQ
              </button>
              <span className={styles.separator}>•</span>
              <button className={styles.legalLink} onClick={() => openModal("aviso")}>
                Aviso
              </button>
            </div>

            {/* Copyright */}
            <div className={styles.footerCopyright}>
              &copy; {currentYear} <strong>A MARTE</strong> · Pijamas Infantiles · Colombia
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {activeModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{legalContent[activeModal]?.title}</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div dangerouslySetInnerHTML={{ __html: legalContent[activeModal]?.content }} />
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalBtn} onClick={closeModal}>
                Cerrar
              </button>
              <button className={`${styles.modalBtn} ${styles.primary}`} onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;