'use client';

import { useState } from "react";
import "./Footer.css";
import { 
  FaFacebook, 
  FaInstagram, 
  FaTwitter, 
  FaWhatsapp,
  FaEnvelope,
  FaPhone,
  FaHeadset,
  FaShieldAlt,
  FaTruck,
  FaCreditCard,
  FaTimes
} from "react-icons/fa";

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
      <footer className="footer">
        <div className="footer-container">
          {/* Column 1: Brand */}
          <div className="footer-column">
            <h2 className="brand-title">A MARTE</h2>
            <p className="brand-tagline">Abriga su libertad</p>
            <p className="brand-description">
              Pijamas pensadas para soñar, moverse y explorar sin límites.
            </p>
            <div className="social-section">
              <a href="https://www.facebook.com/profile.php?id=100087160562926" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaFacebook />
              </a>
              <a href="https://www.instagram.com/amartekids.co/" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaInstagram />
              </a>
              {/* <a href="https://twitter.com/amartepijamas" aria-label="Twitter" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaTwitter />
              </a> */}
              <a href="https://wa.me/573143853248" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer" className="social-icon">
                <FaWhatsapp />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="footer-column">
            <h4 className="footer-title">Enlaces</h4>
            <ul className="footer-links">
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
          <div className="footer-column">
            <h4 className="footer-title">Contacto</h4>
            <div className="contact-items">
              <div className="contact-item">
                {/* <FaPhone className="contact-icon" /> */}
              </div>
              <div className="contact-item">
                <FaWhatsapp className="contact-icon" />
                <div>
                  <span className="contact-text">+57 3143853248</span>
                  <span className="contact-label">WhatsApp</span>
                </div>
              </div>
              <div className="contact-item">
                <FaEnvelope className="contact-icon" />
                <div>
                  <span className="contact-text">orbitaamarte@gmail.com</span>
                  <span className="contact-label">Información</span>
                </div>
              </div>
              <div className="contact-item">
                <FaHeadset className="contact-icon" />
                <div>
                  <span className="contact-text">orbitaamarte@gmail.com</span>
                  <span className="contact-label">Soporte</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 4: Services */}
          <div className="footer-column">
            <h4 className="footer-title">Servicios</h4>
            <div className="services-list">
              <div className="service-item">
                <FaShieldAlt className="service-icon" />
                <span>Compra 100% Segura</span>
              </div>
              <div className="service-item">
                <FaTruck className="service-icon" />
                <span>Envíos a todo Colombia</span>
              </div>
              <div className="service-item">
                <FaCreditCard className="service-icon" />
                <span>Múltiples pagos</span>
              </div>
              <div className="service-item">
                <FaHeadset className="service-icon" />
                <span>Lunes a viernes · 8:00 a. m. – 5:00 p. m.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="footer-bottom">
          {/* Payment Methods */}
          <div className="payment-methods">
            <span>Métodos de pago:</span>
            <div className="payment-icons">
              <span className="payment-icon">Visa</span>
              <span className="payment-icon">Mastercard</span>
              <span className="payment-icon">Nequi</span>
              <span className="payment-icon">Daviplata</span>
            </div>
          </div>

          {/* Legal Links */}
          <div className="legal-section">
            <button className="legal-link" onClick={() => openModal("terminos")}>
              Términos y Condiciones
            </button>
            <button className="legal-link" onClick={() => openModal("privacidad")}>
              Política de Privacidad
            </button>
            <button className="legal-link" onClick={() => openModal("devoluciones")}>
              Política de Devoluciones
            </button>
            <button className="legal-link" onClick={() => openModal("garantias")}>
              Garantías
            </button>
            <button className="legal-link" onClick={() => openModal("preguntas")}>
              Preguntas Frecuentes
            </button>
            <button className="legal-link" onClick={() => openModal("aviso")}>
              Aviso Legal
            </button>
          </div>

          {/* Copyright */}
          <div className="footer-copyright">
            &copy; {currentYear} <strong>A MARTE</strong> • Pijamas Infantiles • Colombia
          </div>
        </div>
      </footer>

      {/* Modal */}
      {activeModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{legalContent[activeModal]?.title}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div dangerouslySetInnerHTML={{ __html: legalContent[activeModal]?.content }} />
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={closeModal}>
                Cerrar
              </button>
              <button className="modal-btn primary" onClick={() => window.print()}>
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