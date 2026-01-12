'use client'
import React, { useState } from 'react';
import './Footer.css';
import { 
  FaFacebook, 
  FaInstagram, 
  FaTwitter, 
  FaLinkedin, 
  FaWhatsapp,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaCreditCard,
  FaTruck,
  FaHeadset,
  FaTimes,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const openModal = (modalName: string) => {
    setActiveModal(modalName);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = 'auto';
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Contenido de los términos y condiciones
  const legalContent = {
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
      `
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
        <p>Usted tiene derecho a:</p>
        <ul>
          <li>Acceder a sus datos personales</li>
          <li>Rectificar datos inexactos</li>
          <li>Solicitar la eliminación de sus datos</li>
          <li>Oponerse al tratamiento de sus datos</li>
        </ul>
      `
    },
    devoluciones: {
      title: "Política de Devoluciones",
      content: `
        <h3>1. PLAZO PARA DEVOLUCIONES</h3>
        <p>Aceptamos devoluciones dentro de los 30 días posteriores a la recepción del producto. El producto debe estar en su estado original, sin usar y con todos los accesorios y empaques originales.</p>

        <h3>2. CONDICIONES PARA DEVOLUCIÓN</h3>
        <p>Para ser elegible para una devolución:</p>
        <ul>
          <li>El producto debe estar en su estado original</li>
          <li>Debe incluir la factura o comprobante de compra</li>
          <li>Debe estar en su empaque original sin daños</li>
          <li>No deben haber transcurrido más de 30 días desde la compra</li>
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
        <p>Los reembolsos se procesarán dentro de los 7-10 días hábiles después de recibir y verificar el producto devuelto. El reembolso se realizará utilizando el mismo método de pago utilizado para la compra original.</p>
      `
    },
    garantias: {
      title: "Garantías",
      content: `
        <h3>1. PERÍODO DE GARANTÍA</h3>
        <p>Todos nuestros productos cuentan con una garantía del fabricante que varía según el producto:</p>
        <ul>
          <li>Electrónicos: 12 meses</li>
          <li>Línea blanca: 24 meses</li>
          <li>Ropa y accesorios: 6 meses</li>
          <li>Productos especiales: Consultar garantía específica</li>
        </ul>

        <h3>2. COBERTURA DE GARANTÍA</h3>
        <p>La garantía cubre:</p>
        <ul>
          <li>Defectos de fabricación</li>
          <li>Fallos en componentes</li>
          <li>Problemas de funcionamiento bajo uso normal</li>
        </ul>
        <p>La garantía NO cubre:</p>
        <ul>
          <li>Daños por uso indebido</li>
          <li>Daños por accidentes</li>
          <li>Desgaste normal del producto</li>
          <li>Modificaciones no autorizadas</li>
        </ul>

        <h3>3. ACTIVACIÓN DE GARANTÍA</h3>
        <p>Para activar la garantía:</p>
        <ol>
          <li>Conserve la factura de compra original</li>
          <li>Mantenga el producto en su empaque original</li>
          <li>Contacte a nuestro servicio técnico autorizado</li>
          <li>Presente el producto para evaluación</li>
        </ol>
      `
    },
    preguntas: {
      title: "Preguntas Frecuentes",
      content: `
        <div class="faq-section">
          <div class="faq-item">
            <div class="faq-question" onClick={() => toggleSection('envio')}>
              <h4>¿Cuánto tarda el envío?</h4>
              <span>{expandedSection === 'envio' ? <FaChevronUp /> : <FaChevronDown />}</span>
            </div>
            {expandedSection === 'envio' && (
              <div class="faq-answer">
                <p>Los tiempos de envío varían según la ubicación:</p>
                <ul>
                  <li>Ciudad principal: 1-2 días hábiles</li>
                  <li>Otras ciudades: 3-5 días hábiles</li>
                  <li>Zonas rurales: 5-7 días hábiles</li>
                </ul>
              </div>
            )}
          </div>

          <div class="faq-item">
            <div class="faq-question" onClick={() => toggleSection('pago')}>
              <h4>¿Qué métodos de pago aceptan?</h4>
              <span>{expandedSection === 'pago' ? <FaChevronUp /> : <FaChevronDown />}</span>
            </div>
            {expandedSection === 'pago' && (
              <div class="faq-answer">
                <p>Aceptamos los siguientes métodos de pago:</p>
                <ul>
                  <li>Tarjetas de crédito/débito (Visa, Mastercard)</li>
                  <li>Transferencias bancarias</li>
                  <li>Mercado Pago</li>
                  <li>Efectivo en puntos autorizados</li>
                </ul>
              </div>
            )}
          </div>

          <div class="faq-item">
            <div class="faq-question" onClick={() => toggleSection('seguimiento')}>
              <h4>¿Cómo puedo seguir mi pedido?</h4>
              <span>{expandedSection === 'seguimiento' ? <FaChevronUp /> : <FaChevronDown />}</span>
            </div>
            {expandedSection === 'seguimiento' && (
              <div class="faq-answer">
                <p>Una vez despachado tu pedido, recibirás un correo con:</p>
                <ul>
                  <li>Número de tracking</li>
                  <li>Enlace para seguimiento</li>
                  <li>Número de guía</li>
                  <li>Contacto del transportista</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      `
    },
    aviso: {
      title: "Aviso Legal",
      content: `
        <h3>1. INFORMACIÓN GENERAL</h3>
        <p><strong>A Marte Ecommerce</strong> es una empresa dedicada a la venta de productos en línea.</p>
        
        <h3>2. PROPIEDAD INTELECTUAL</h3>
        <p>Todos los contenidos de este sitio web, incluyendo textos, gráficos, logotipos, imágenes, y software, son propiedad de A Marte o de sus proveedores de contenidos y están protegidos por las leyes de propiedad intelectual.</p>

        <h3>3. LIMITACIÓN DE RESPONSABILIDAD</h3>
        <p>A Marte no será responsable por:</p>
        <ul>
          <li>Daños indirectos, incidentales o consecuentes</li>
          <li>Interrupciones del servicio</li>
          <li>Errores u omisiones en el contenido</li>
          <li>Uso indebido de la información proporcionada</li>
        </ul>

        <h3>4. LEY APLICABLE</h3>
        <p>Estos términos se regirán e interpretarán de acuerdo con las leyes del país donde opera la empresa, sin dar efecto a ningún principio de conflictos de leyes.</p>

        <h3>5. MODIFICACIONES</h3>
        <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio web.</p>
      `
    }
  };

  return (
    <>
      <footer className="footer">
        {/* Sección superior */}
        <div className="footer-top">
          <div className="footer-container">
            
            {/* Columna 1: Sobre la tienda */}
            <div className="footer-column">
              <h3 className="footer-title">A Marte</h3>
              <p className="footer-description">
                Tu tienda de confianza en línea. Ofrecemos productos de calidad con garantía y entrega segura.
              </p>
              <div className="social-links">
                <a href="https://facebook.com" aria-label="Facebook" className="social-link" target="_blank" rel="noopener noreferrer">
                  <FaFacebook />
                </a>
                <a href="https://instagram.com" aria-label="Instagram" className="social-link" target="_blank" rel="noopener noreferrer">
                  <FaInstagram />
                </a>
                <a href="https://twitter.com" aria-label="Twitter" className="social-link" target="_blank" rel="noopener noreferrer">
                  <FaTwitter />
                </a>
                <a href="https://linkedin.com" aria-label="LinkedIn" className="social-link" target="_blank" rel="noopener noreferrer">
                  <FaLinkedin />
                </a>
                <a href="https://wa.me/15551234567" aria-label="WhatsApp" className="social-link" target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp />
                </a>
              </div>
            </div>

            {/* Columna 2: Enlaces rápidos */}
            <div className="footer-column">
              <h4 className="footer-subtitle">Enlaces Rápidos</h4>
              <ul className="footer-links">
                <li><a href="/productos">Productos</a></li>
                <li><a href="/categorias">Categorías</a></li>
                <li><a href="/ofertas">Ofertas Especiales</a></li>
                <li><a href="/nuevos">Nuevos Productos</a></li>
                <li><a href="/mas-vendidos">Más Vendidos</a></li>
              </ul>
            </div>

            {/* Columna 3: Información de contacto */}
            <div className="footer-column">
              <h4 className="footer-subtitle">Contáctanos</h4>
              <ul className="contact-info">
                <li>
                  <FaPhone className="contact-icon" />
                  <div>
                    <span className="contact-text">+1 (555) 123-4567</span>
                    <span className="contact-label">Ventas</span>
                  </div>
                </li>
                <li>
                  <FaWhatsapp className="contact-icon" />
                  <div>
                    <span className="contact-text">+1 (555) 987-6543</span>
                    <span className="contact-label">WhatsApp</span>
                  </div>
                </li>
                <li>
                  <FaEnvelope className="contact-icon" />
                  <div>
                    <span className="contact-text">info@amarte.com</span>
                    <span className="contact-label">Información</span>
                  </div>
                </li>
                <li>
                  <FaEnvelope className="contact-icon" />
                  <div>
                    <span className="contact-text">ventas@amarte.com</span>
                    <span className="contact-label">Ventas</span>
                  </div>
                </li>
                <li>
                  <FaMapMarkerAlt className="contact-icon" />
                  <div>
                    <span className="contact-text">Av. Principal 123</span>
                    <span className="contact-label">Ciudad, País</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* Columna 4: Servicios y garantías */}
            <div className="footer-column">
              <h4 className="footer-subtitle">Nuestros Servicios</h4>
              <ul className="services-list">
                <li>
                  <FaShieldAlt className="service-icon" />
                  <span>Compra 100% Segura</span>
                </li>
                <li>
                  <FaCreditCard className="service-icon" />
                  <span>Múltiples Métodos de Pago</span>
                </li>
                <li>
                  <FaTruck className="service-icon" />
                  <span>Envíos a Todo el País</span>
                </li>
                <li>
                  <FaHeadset className="service-icon" />
                  <span>Soporte 24/7</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sección de términos y legal */}
        <div className="footer-middle">
          <div className="legal-links">
            <button className="legal-link" onClick={() => openModal('terminos')}>
              Términos y Condiciones
            </button>
            <button className="legal-link" onClick={() => openModal('privacidad')}>
              Política de Privacidad
            </button>
            <button className="legal-link" onClick={() => openModal('devoluciones')}>
              Política de Devoluciones
            </button>
            <button className="legal-link" onClick={() => openModal('garantias')}>
              Garantías
            </button>
            <button className="legal-link" onClick={() => openModal('preguntas')}>
              Preguntas Frecuentes
            </button>
            <button className="legal-link" onClick={() => openModal('aviso')}>
              Aviso Legal
            </button>
          </div>
        </div>

        {/* Sección inferior */}
        <div className="footer-bottom">
          <div className="payment-methods">
            <span>Métodos de pago aceptados:</span>
            <div className="payment-icons">
              <span className="payment-icon">Visa</span>
              <span className="payment-icon">Mastercard</span>
              <span className="payment-icon">Mercado Pago</span>
              <span className="payment-icon">Transferencia</span>
              <span className="payment-icon">Efectivo</span>
            </div>
          </div>
          <p className="copyright">
            &copy; {currentYear} <strong>A Marte</strong>. Todos los derechos reservados.
          </p>
          <p className="disclaimer">
            Los precios y disponibilidad están sujetos a cambio. Verifique los términos completos en nuestra página legal.
          </p>
        </div>
      </footer>

      {/* Modal para términos y condiciones */}
      {activeModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{legalContent[activeModal as keyof typeof legalContent].title}</h2>
              <button className="modal-close" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              {activeModal === 'preguntas' ? (
                <div dangerouslySetInnerHTML={{ __html: legalContent[activeModal].content }} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: legalContent[activeModal as keyof typeof legalContent].content }} />
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-button" onClick={closeModal}>
                Cerrar
              </button>
              <button className="modal-button primary" onClick={() => window.print()}>
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