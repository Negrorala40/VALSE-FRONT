'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ProductDetails {
  productId: number;
  productName: string;
  productDescription: string;
  productGender: string;
  productType: string;
  productEnabled: boolean;
  totalStock: number;
  needsMetaSetup: boolean;
  enabledForFacebook: boolean;
  
  // Campos Meta
  googleProductCategory: string;
  fbProductCategory: string;
  ageGroup: string;
  materialEnglish: string;
  patternEnglish: string;
  styleEnglish: string;
  brand: string;
  shippingDetails: string;
  shippingWeight: string;
  shippingWeightUnit: string;
  gtin: string;
  
  // Variantes
  variants: Array<{
    variantId: number;
    color: string;
    size: string;
    stock: number;
    price: number;
    colorEnglish: string;
    sizeStandard: string;
    availabilityStatus: string;
    primaryImageUrl: string;
  }>;
}

// Traducción de colores común
const COLOR_TRANSLATIONS: Record<string, string> = {
  'rojo': 'red',
  'azul': 'blue',
  'verde': 'green',
  'amarillo': 'yellow',
  'negro': 'black',
  'blanco': 'white',
  'rosa': 'pink',
  'morado': 'purple',
  'naranja': 'orange',
  'gris': 'gray',
  'marrón': 'brown',
  'beige': 'beige',
  'azul marino': 'navy blue',
  'verde oliva': 'olive green',
  'rojo vino': 'burgundy',
  'mostaza': 'mustard',
  'menta': 'mint',
  'coral': 'coral',
  'lavanda': 'lavender',
};

export default function ProductConfigPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [colorTranslation, setColorTranslation] = useState('');
  
  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/meta-admin/products/${params.id}`);
      const data = await res.json();
      setProduct(data);
    } catch (error) {
      console.error('Error cargando producto:', error);
      alert('❌ Error cargando producto');
    } finally {
      setLoading(false);
    }
  };

  const translateColor = (spanishColor: string) => {
    if (!spanishColor) return spanishColor;
    const lowerColor = spanishColor.toLowerCase();
    
    // Buscar traducción exacta
    if (COLOR_TRANSLATIONS[lowerColor]) {
      return COLOR_TRANSLATIONS[lowerColor];
    }
    
    // Buscar coincidencias parciales
    for (const [key, value] of Object.entries(COLOR_TRANSLATIONS)) {
      if (lowerColor.includes(key)) {
        return value;
      }
    }
    
    return spanishColor;
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setColorTranslation(translateColor(color));
  };

  const applyColorToAll = () => {
    if (!product || !colorTranslation) return;
    
    const updatedVariants = product.variants.map(variant => ({
      ...variant,
      colorEnglish: colorTranslation
    }));
    
    setProduct({
      ...product,
      variants: updatedVariants
    });
    
    alert(`✅ Color "${colorTranslation}" aplicado a todas las variantes`);
  };

  const updateVariantColor = (variantId: number, colorEnglish: string) => {
    if (!product) return;
    
    setProduct({
      ...product,
      variants: product.variants.map(v => 
        v.variantId === variantId ? { ...v, colorEnglish } : v
      )
    });
  };

  const saveConfig = async () => {
    if (!product) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/meta-admin/products/${product.productId}/meta-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleProductCategory: product.googleProductCategory,
          fbProductCategory: product.fbProductCategory,
          ageGroup: product.ageGroup,
          materialEnglish: product.materialEnglish,
          patternEnglish: product.patternEnglish,
          styleEnglish: product.styleEnglish,
          brand: product.brand,
          shippingDetails: product.shippingDetails,
          shippingWeight: product.shippingWeight,
          shippingWeightUnit: product.shippingWeightUnit,
          gtin: product.gtin,
          enabledForFacebook: product.enabledForFacebook,
        })
      });

      if (response.ok) {
        alert('✅ Configuración guardada exitosamente');
        fetchProduct(); // Recargar datos
      } else {
        throw new Error('Error guardando configuración');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('❌ Error guardando configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando producto...</div>;
  if (!product) return <div>Producto no encontrado</div>;

  // CÁLCULOS CORREGIDOS - LA CLAVE ESTÁ AQUÍ
  const availableVariants = product.variants.filter(v => v.stock > 0);
  const unavailableVariants = product.variants.filter(v => v.stock === 0);
  const lowStockVariants = product.variants.filter(v => v.stock > 0 && v.stock < 10);
  
  // Stock total REAL (suma de todas las variantes con stock > 0)
  const totalRealStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  
  // ¿Tiene al menos UNA variante disponible para Meta?
  // IMPORTANTE: Solo está disponible para Meta si:
  // 1. El producto está habilitado para Facebook
  // 2. Y tiene al menos UNA variante con stock > 0
  const hasAvailableForMeta = product.enabledForFacebook && availableVariants.length > 0;
  
  // Stock para Meta (solo variantes con stock > 0)
  const stockForMeta = availableVariants.reduce((sum, v) => sum + v.stock, 0);
  
  const uniqueColors = [...new Set(product.variants.map(v => v.color).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div>
        <button onClick={() => router.push('/meta/products')}>
          ← Volver a Productos
        </button>
        <div>
          <h1>⚙️ Configuración Meta: {product.productName}</h1>
          <div>
            <button 
              onClick={async () => {
                try {
                  await fetch(`/api/meta-admin/products/${product.productId}/sync-stock`, { 
                    method: 'POST' 
                  });
                  alert('🔄 Sincronización de stock iniciada');
                  // Recargar después de unos segundos
                  setTimeout(fetchProduct, 2000);
                } catch (error) {
                  alert('❌ Error sincronizando stock');
                }
              }}
            >
              🔄 Sincronizar Stock
            </button>
            <button 
              onClick={() => window.open(`/admin/products/${product.productId}`, '_blank')}
            >
              ✏️ Editar Producto
            </button>
          </div>
        </div>
      </div>

      <div>
        {/* Columna Izquierda: Datos Sincronizados */}
        <div>
          <div>
            <h2>✅ Datos Sincronizados Automáticamente</h2>
            
            <div>
              <div>
                <label>Nombre del Producto</label>
                <p>{product.productName}</p>
              </div>
              
              <div>
                <label>Stock Total en Sistema</label>
                <div>
                  <p>
                    {totalRealStock} unidades totales
                  </p>
                  <p>
                    ({availableVariants.length} variantes con stock, {unavailableVariants.length} sin stock)
                  </p>
                </div>
              </div>
              
              <div>
                <label>Disponible para Meta</label>
                <div>
                  {hasAvailableForMeta ? (
                    <>
                      <span>✅</span>
                      <span>Sí ({stockForMeta} unidades disponibles)</span>
                    </>
                  ) : (
                    <>
                      <span>❌</span>
                      <span>
                        {!product.enabledForFacebook ? 'Producto deshabilitado para Meta' : 
                         availableVariants.length === 0 ? 'Sin variantes con stock' : 
                         'No disponible'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <label>Género</label>
                <p>{product.productGender || 'No especificado'}</p>
              </div>
              
              <div>
                <label>Tipo</label>
                <p>{product.productType || 'No especificado'}</p>
              </div>
              
              <div>
                <label>Descripción</label>
                <p>{product.productDescription || 'Sin descripción'}</p>
              </div>
            </div>
          </div>

          {/* Variantes */}
          <div>
            <h2>🎨 Variantes y Stock</h2>
            
            <div>
              <div>
                <div>{availableVariants.length}</div>
                <div>Con Stock</div>
                <div>{stockForMeta} unidades</div>
              </div>
              <div>
                <div>{lowStockVariants.length}</div>
                <div>Bajo Stock (&lt;10)</div>
                <div>{lowStockVariants.reduce((sum, v) => sum + v.stock, 0)} unidades</div>
              </div>
              <div>
                <div>{unavailableVariants.length}</div>
                <div>Agotadas</div>
                <div>0 unidades</div>
              </div>
            </div>

            {/* Tabla de Variantes */}
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Talla</th>
                    <th>Stock</th>
                    <th>Precio</th>
                    <th>Color (Inglés)</th>
                    <th>Estado</th>
                    <th>Para Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((variant) => {
                    // Una variante está disponible para Meta solo si:
                    // 1. Tiene stock > 0
                    // 2. El producto está habilitado para Facebook
                    const availableForMeta = variant.stock > 0 && product.enabledForFacebook;
                    
                    return (
                      <tr key={variant.variantId}>
                        <td>{variant.color}</td>
                        <td>{variant.size}</td>
                        <td>
                          <span>
                            {variant.stock}
                          </span>
                        </td>
                        <td>${variant.price?.toFixed(2) || '0.00'}</td>
                        <td>
                          <input
                            type="text"
                            value={variant.colorEnglish || ''}
                            onChange={(e) => updateVariantColor(variant.variantId, e.target.value)}
                            placeholder="Inglés..."
                          />
                        </td>
                        <td>
                          <span>
                            {variant.availabilityStatus}
                          </span>
                        </td>
                        <td>
                          {availableForMeta ? (
                            <span>✅ Sí</span>
                          ) : variant.stock === 0 ? (
                            <span>❌ Sin stock</span>
                          ) : (
                            <span>❌ Producto deshabilitado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Traductor de Colores */}
            {uniqueColors.length > 0 && (
              <div>
                <h3>🎨 Traductor de Colores</h3>
                <p>Colores encontrados en variantes:</p>
                
                <div>
                  {uniqueColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
                
                {selectedColor && colorTranslation && (
                  <div>
                    <p>
                      <strong>Traducción sugerida:</strong><br />
                      "{selectedColor}" → "{colorTranslation}"
                    </p>
                    <button onClick={applyColorToAll}>
                      Aplicar a Todas las Variantes
                    </button>
                    <p>
                      Esta traducción se aplicará a todas las variantes con el color "{selectedColor}"
                    </p>
                  </div>
                )}
                
                <p>
                  💡 Los colores en inglés mejoran la búsqueda en Facebook/Instagram Shopping
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Configuración Meta */}
        <div>
          <div>
            <h2>⚙️ Configuración para Meta</h2>
            
            <div>
              {/* Estado del producto - MUY IMPORTANTE */}
              <div>
                <div>
                  {hasAvailableForMeta ? (
                    <>
                      <span>✅</span>
                      <span>DISPONIBLE PARA META</span>
                    </>
                  ) : (
                    <>
                      <span>⚠️</span>
                      <span>NO DISPONIBLE PARA META</span>
                    </>
                  )}
                </div>
                
                <div>
                  {hasAvailableForMeta ? (
                    <>
                      <p>✅ Producto habilitado para Meta</p>
                      <p>✅ {availableVariants.length} variantes con stock disponible</p>
                      <p>✅ Total: {stockForMeta} unidades para venta</p>
                      {unavailableVariants.length > 0 && (
                        <p>⚠️ {unavailableVariants.length} variantes sin stock (no se incluirán)</p>
                      )}
                    </>
                  ) : (
                    <>
                      {!product.enabledForFacebook ? (
                        <p>❌ Producto deshabilitado en configuración Meta</p>
                      ) : availableVariants.length === 0 ? (
                        <p>❌ Ninguna variante tiene stock</p>
                      ) : (
                        <p>❌ Revisa la configuración</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* Categorías (REQUERIDAS) */}
              <div>
                <label>Categoría Google *</label>
                <input
                  type="text"
                  value={product.googleProductCategory || ''}
                  onChange={(e) => setProduct({...product, googleProductCategory: e.target.value})}
                  placeholder="Ej: Apparel & Accessories > Clothing"
                />
                <small>Requerido por Meta</small>
              </div>
              
              <div>
                <label>Categoría Facebook *</label>
                <input
                  type="text"
                  value={product.fbProductCategory || ''}
                  onChange={(e) => setProduct({...product, fbProductCategory: e.target.value})}
                  placeholder="Ej: Clothing & Accessories > Clothing"
                />
              </div>
              
              {/* Demografía */}
              <div>
                <div>
                  <label>Grupo de Edad</label>
                  <select
                    value={product.ageGroup || ''}
                    onChange={(e) => setProduct({...product, ageGroup: e.target.value})}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="newborn">Recién nacido</option>
                    <option value="infant">Infante</option>
                    <option value="toddler">Niño pequeño</option>
                    <option value="kids">Niños</option>
                    <option value="teen">Adolescentes</option>
                    <option value="adult">Adulto</option>
                  </select>
                </div>
                
                <div>
                  <label>Material (Inglés) *</label>
                  <input
                    type="text"
                    value={product.materialEnglish || ''}
                    onChange={(e) => setProduct({...product, materialEnglish: e.target.value})}
                    placeholder="Ej: 100% cotton, polyester"
                  />
                </div>
              </div>
              
              {/* Marca y Detalles */}
              <div>
                <label>Marca</label>
                <input
                  type="text"
                  value={product.brand || 'Amarte Colombia'}
                  onChange={(e) => setProduct({...product, brand: e.target.value})}
                />
              </div>
              
              <div>
                <label>Patrón</label>
                <input
                  type="text"
                  value={product.patternEnglish || ''}
                  onChange={(e) => setProduct({...product, patternEnglish: e.target.value})}
                  placeholder="Ej: plain, striped, floral"
                />
              </div>
              
              <div>
                <label>Estilo</label>
                <input
                  type="text"
                  value={product.styleEnglish || ''}
                  onChange={(e) => setProduct({...product, styleEnglish: e.target.value})}
                  placeholder="Ej: casual, formal, sport"
                />
              </div>
              
              {/* Envíos Colombia */}
              <div>
                <label>Configuración de Envíos</label>
                <textarea
                  value={product.shippingDetails || ''}
                  onChange={(e) => setProduct({...product, shippingDetails: e.target.value})}
                  placeholder="CO:::Standard:0.0 COP;CO:Bogota:Express:5000.0 COP"
                  rows={3}
                />
                <small>
                  Formato: País:Región:Servicio:Precio<br />
                  Ejemplo: CO:::Standard:0.0 COP;CO:Bogota:Express:5000.0 COP
                </small>
              </div>
              
              {/* Peso */}
              <div>
                <div>
                  <label>Peso</label>
                  <input
                    type="text"
                    value={product.shippingWeight || ''}
                    onChange={(e) => setProduct({...product, shippingWeight: e.target.value})}
                    placeholder="0.5"
                  />
                </div>
                
                <div>
                  <label>Unidad</label>
                  <select
                    value={product.shippingWeightUnit || 'kg'}
                    onChange={(e) => setProduct({...product, shippingWeightUnit: e.target.value})}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
              </div>
              
              {/* GTIN */}
              <div>
                <label>GTIN (Código de barras)</label>
                <input
                  type="text"
                  value={product.gtin || ''}
                  onChange={(e) => setProduct({...product, gtin: e.target.value})}
                  placeholder="Ej: 8806088573892"
                />
              </div>
              
              {/* Estado Meta - EL MÁS IMPORTANTE */}
              <div>
                <input
                  type="checkbox"
                  id="enabledForFacebook"
                  checked={product.enabledForFacebook}
                  onChange={(e) => setProduct({...product, enabledForFacebook: e.target.checked})}
                />
                <label htmlFor="enabledForFacebook">
                  <span>
                    {product.enabledForFacebook ? '✅' : '❌'}
                  </span>
                  <span>
                    Habilitado para Facebook/Instagram Shopping
                    <span>
                      {product.enabledForFacebook 
                        ? ' (Aparecerá en el catálogo si tiene al menos una variante con stock)' 
                        : ' (NO aparecerá en el catálogo)'}
                    </span>
                  </span>
                </label>
              </div>
              
              {/* Botón Guardar */}
              <div>
                <button 
                  onClick={saveConfig} 
                  disabled={saving}
                >
                  {saving ? '💾 Guardando...' : '💾 Guardar Configuración Meta'}
                </button>
                <p>
                  * Campos requeridos para publicar en Meta
                </p>
              </div>
            </div>
          </div>
          
          {/* Vista Previa CSV - CORREGIDA */}
          <div>
            <h2>👁️ Vista Previa en CSV</h2>
            
            <div>
              <div>
                <span>id</span>
                <span>title</span>
                <span>availability</span>
                <span>price</span>
                <span>quantity_to_sell_on_facebook</span>
              </div>
              
              {availableVariants.slice(0, 3).map((variant) => (
                <div key={variant.variantId}>
                  <span>"V{variant.variantId}"</span>
                  <span>"{product.productName} - {variant.colorEnglish || variant.color}"</span>
                  <span>"in stock"</span>
                  <span>"{variant.price?.toFixed(2)} COP"</span>
                  <span>{variant.stock}</span>
                </div>
              ))}
              
              {availableVariants.length === 0 && (
                <div>
                  <span>—</span>
                  <span>No hay variantes disponibles para Meta</span>
                  <span>—</span>
                  <span>—</span>
                  <span>—</span>
                </div>
              )}
              
              {availableVariants.length > 3 && (
                <div>
                  ... y {availableVariants.length - 3} variantes más
                </div>
              )}
            </div>
            
            <div>
              {hasAvailableForMeta ? (
                <div>
                  <div>
                    <span>✅</span>
                    <span>ESTE PRODUCTO APARECERÁ EN EL CATÁLOGO</span>
                  </div>
                  <div>
                    <p><strong>Resumen:</strong></p>
                    <ul>
                      <li>✅ Producto habilitado para Meta</li>
                      <li>✅ {availableVariants.length} variantes con stock</li>
                      <li>✅ Total: {stockForMeta} unidades disponibles</li>
                      <li>❌ {unavailableVariants.length} variantes sin stock (no se incluirán)</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <div>
                    <span>❌</span>
                    <span>ESTE PRODUCTO NO APARECERÁ EN EL CATÁLOGO</span>
                  </div>
                  <div>
                    {!product.enabledForFacebook ? (
                      <p>El producto está <strong>deshabilitado</strong> en la configuración Meta.</p>
                    ) : availableVariants.length === 0 ? (
                      <p>Todas las variantes están <strong>sin stock</strong>.</p>
                    ) : (
                      <p>Hay {availableVariants.length} variantes con stock, pero revisa la configuración.</p>
                    )}
                    <p>
                      Para que aparezca en el catálogo:
                      <br />1. Habilitar producto para Meta (checkbox arriba)
                      <br />2. Tener al menos una variante con stock
                      <br />3. Completar todos los campos requeridos (*)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}