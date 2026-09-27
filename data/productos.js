/* 🔥 Feature 02.6: se agregan stock / disponible / maxCompra a cada
   producto para soportar control de cantidad, agotados y límites de
   compra (ver js/carrito.js: estaAgotado, cantidadMaximaPermitida,
   validarCantidadProducto).

   IMPORTANTE — valores de PRUEBA, no inventario comercial real:
   estos números son temporales, únicamente para poder probar los
   distintos escenarios (agotado, stock bajo, límite de compra bajo,
   stock/límite generosos). No representan el stock real de la tienda;
   cuando exista panel administrador/backend, esos valores reemplazarán
   a estos. maxCompra ausente cae al límite global por defecto
   (MAX_CANTIDAD_POR_PRODUCTO_DEFAULT, en js/carrito.js).

   🔥 Feature 02.7: se agregan campos opcionales de ficha informativa
   (descripcionCorta, descripcion, material, medidas, cuidados, detalles).
   TODOS son opcionales: un producto puede tener solo alguno de ellos —
   ver js/app.js (renderDescripcionesModal / renderDetallesProducto), que
   nunca renderiza un campo ausente/null/vacío ni una etiqueta huérfana.

   IMPORTANTE — DATOS DEMO, fácilmente reemplazables:
   los valores de descripcionCorta/descripcion/material/medidas/cuidados/
   detalles usados aquí son de PRUEBA, para validar los distintos
   escenarios de la ficha (campo completo, campo faltante, detalles
   dinámicos, producto agotado con información completa, etc.). NO son
   especificaciones comerciales reales de estos productos. Cuando exista
   el panel administrativo (ver sección 13 de la Feature 02.7), estos
   valores se reemplazarán por los que cargue quien administre la tienda. */
const productos = [
  {
    id: 1,
    nombre: "Bolsa Tejida",
    precio: 599,
    variante: "Blanca",
    categoria: "bolsas",
    imagen: "assets/videos/images/producto1.jpg",
    stock: 12, // prueba
    disponible: true,
    maxCompra: 10,

    // PRODUCTO C (demo Feature 02.7): únicamente descripcionCorta, sin
    // material/medidas/cuidados/detalles — valida que la ficha no
    // renderice secciones ni etiquetas huérfanas cuando esos campos
    // no existen.
    descripcionCorta: "Bolsa tejida ligera, ideal para el día a día. (DEMO)"
  },
  {
    id: 2,
    nombre: "Lapicera Minimal",
    variante: "Azul",
    precio: 199,
    categoria: "lapiceras",
    imagen: "assets/videos/images/producto2.jpg",
    stock: 25, // prueba
    disponible: true,
    maxCompra: 10
  },
  {
    id: 3,
    nombre: "Bolsa Premium Negra",
    variante: "Negra",
    precio: 899,
    categoria: "bolsas",
    imagen: "assets/videos/images/producto3.webp",
    stock: 0, // prueba — agotado a propósito, para validar ese escenario
    disponible: false,
    maxCompra: 10,

    // PRODUCTO D (demo Feature 02.7): agotado PERO con ficha completa —
    // valida que la información siga visible aunque la compra esté
    // bloqueada (solo la acción de comprar se bloquea, según Feature 02.6).
    descripcionCorta: "Bolsa premium de cuero sintético, acabado negro mate. (DEMO)",
    descripcion:
      "Bolsa premium de cuero sintético con acabado negro mate y herrajes " +
      "tono oro. Interior forrado con bolsillo con cierre y bolsillo " +
      "abierto para objetos pequeños. Pensada para uso diario y ocasiones " +
      "formales. (DEMO — texto de prueba, no definitivo)",
    material: "Cuero sintético (DEMO)",
    medidas: "30 x 22 x 10 cm (DEMO)",
    cuidados: "Limpiar con paño seco. Evitar exposición prolongada al sol. (DEMO)",
    detalles: [
      { etiqueta: "Tipo de cierre", valor: "Cremallera" },
      { etiqueta: "Compartimentos", valor: "2" },
      { etiqueta: "Correa", valor: "Ajustable, desmontable" }
    ]
  },
  {
    id: 4,
    nombre: "Mochila Urbana",
    variante: "Azul",
    precio: 999,
    categoria: "mochilas",
    imagen: "assets/videos/images/producto4.jpg",
    stock: 8, // prueba
    disponible: true,
    maxCompra: 10,

    // PRODUCTO B (demo Feature 02.7): descripcionCorta + material +
    // medidas, SIN cuidados ni detalles adicionales — valida que la
    // ficha se adapte mostrando solo lo disponible.
    descripcionCorta: "Mochila urbana resistente para uso diario. (DEMO)",
    material: "Poliéster resistente al agua (DEMO)",
    medidas: "42 x 30 x 15 cm (DEMO)"
  },
  {
    id: 5,
    nombre: "Mochila Urbana",
    variante: "Negra",
    precio: 999,
    categoria: "mochilas",
    imagen: "assets/videos/images/producto3.webp",
    stock: 3, // prueba — stock bajo, para validar el mensaje de stock
    disponible: true,
    maxCompra: 10
  },
  {
    id: 6,
    nombre: "Mochila Urbana",
    variante: "Blanca",
    precio: 999,
    categoria: "mochilas",
    imagen: "assets/videos/images/producto4.jpg",
    stock: 15, // prueba
    disponible: true,
    maxCompra: 10
  },
  {
    id: 7,
    nombre: "Mochila Urbana",
    variante: "Roja",
    precio: 999,
    categoria: "mochilas",
    imagen: "assets/videos/images/producto2.jpg",
    stock: 6, // prueba
    disponible: true,
    maxCompra: 10
  },
  {
  id: 8,
  nombre: "Mochila TEQUI",
  variante: "Verde",
  precio: 999,
  categoria: "mochilas",
  imagen: "assets/videos/images/producto1.jpg", // portada

  imagenes: [
    "assets/videos/images/producto1.jpg",
    "assets/videos/images/producto3.webp",
    "assets/videos/images/producto4.jpg"
  ],
  stock: 5, // prueba — usado en las pruebas obligatorias de stock/límite
  disponible: true,
  maxCompra: 10,

  // PRODUCTO A (demo Feature 02.7): TODOS los campos de la ficha
  // informativa presentes — valida el escenario completo (descripción
  // corta distinta de la completa, material, medidas, cuidados y
  // múltiples detalles adicionales).
  descripcionCorta: "Bolsa tejida ligera para uso diario. (DEMO)",
  descripcion:
    "Bolsa de diseño tejido con espacio interior amplio y acabado " +
    "minimalista. Confeccionada para acompañar el uso diario sin perder " +
    "estilo, combina fácilmente con looks casuales y formales. " +
    "(DEMO — texto de prueba, no definitivo)",
  material: "Material sintético tejido (DEMO)",
  medidas: "34 x 26 x 12 cm (DEMO)",
  cuidados: "Limpiar con un paño ligeramente húmedo. No utilizar solventes. (DEMO)",
  detalles: [
    { etiqueta: "Tipo de cierre", valor: "Magnético" },
    { etiqueta: "Compartimentos", valor: "3" }
  ]
},
  {
    id: 9,
    nombre: "Mochila Urbana",
    variante: "Verde",
    precio: 999,
    categoria: "mochilas",
    imagen: "assets/videos/images/Canon_00001825.webp",
    stock: 20, // prueba
    disponible: true,
    maxCompra: 5 // prueba — límite de compra bajo, para validar ese escenario
  }

];

