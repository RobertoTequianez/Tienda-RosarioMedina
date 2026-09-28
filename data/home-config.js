/* 🔥 Feature 07A — CONFIGURACIÓN TEMPORAL DE LA HOME.
   ==========================================================================
   Auditoría (ver reporte de Feature 07A): data/productos.js NO contiene
   ningún campo real de "destacado", "featured", "orden", "popular",
   "ventas", "rating" ni "descuento". Por lo tanto NO se inventa ninguna
   etiqueta comercial ("Más vendido", estrellas, reviews, descuentos) ni se
   calcula "destacado" a partir de datos que no existen.

   Este archivo es el ÚNICO punto centralizado que decide qué productos
   aparecen en la Home y cuántos como máximo — nada de esto vive disperso
   en HTML/JS (spec §5: "No dispersar IDs por HTML/JS").

   IMPORTANTE — ES UNA SELECCIÓN DEMO, EXPLÍCITAMENTE TEMPORAL:
   los IDs de "destacados" abajo son una selección de muestra elegida solo
   para poder mostrar la Home como escaparate mientras no existe todavía
   una selección real de negocio ni un panel administrador. Se excluyó el
   producto id 3 (Bolsa Premium Negra) de la selección demo porque está
   agotado a propósito (dato de prueba, ver data/productos.js) y no tiene
   sentido de negocio destacar en el escaparate principal un producto sin
   stock — el resto de los 9 productos reales del catálogo sí participan.

   Cuando exista un panel administrador (ver Feature 07A, punto 6 y 19 del
   requerimiento), este archivo será reemplazado por datos reales que el
   administrador controle (mostrar en Home, destacado, orden, publicación)
   — la forma de este objeto (maxProductos + destacados: [ids en orden])
   ya queda preparada conceptualmente para ese reemplazo futuro: bastará
   con que el backend entregue la misma forma de datos (o equivalente) sin
   tener que tocar la lógica de renderizado de la Home (ver js/app.js:
   renderProductosDestacadosHome()). */
const HOME_CONFIG = {
  maxProductos: 8,

  // DEMO/TEMPORAL — no representa una selección comercial real todavía.
  destacados: [1, 2, 4, 5, 6, 7, 8, 9]
};
