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
   (MAX_CANTIDAD_POR_PRODUCTO_DEFAULT, en js/carrito.js). */
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
    maxCompra: 10
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
    imagen: "assets/videos/images/producto3.png",
    stock: 0, // prueba — agotado a propósito, para validar ese escenario
    disponible: false,
    maxCompra: 10
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
    maxCompra: 10
  },
  {
    id: 5,
    nombre: "Mochila Urbana",
    variante: "Negra",
    precio: 999,
    categoria: "mochilas",
    imagen: "assets/videos/images/producto3.png",
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
    "assets/videos/images/producto3.png",
    "assets/videos/images/producto4.jpg"
  ],
  stock: 5, // prueba — usado en las pruebas obligatorias de stock/límite
  disponible: true,
  maxCompra: 10
},
  {
    id: 9,
    nombre: "Mochila Urbana",
    variante: "Verde",
    precio: 999,
    categoria: "mochilas",
    imagen: "assets/videos/images/Canon_00001825.JPG",
    stock: 20, // prueba
    disponible: true,
    maxCompra: 5 // prueba — límite de compra bajo, para validar ese escenario
  }

];

