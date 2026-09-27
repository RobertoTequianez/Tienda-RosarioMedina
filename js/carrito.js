/* 🔥 localStorage (Feature 05, punto 22): es únicamente persistencia de
   FRONTEND/DEMO — sobrevive recargas de página en este navegador, nada
   más. En producción NO será la autoridad de precio, stock, descuentos,
   envío ni total final: todo eso deberá revalidarse del lado del servidor
   cuando exista backend/checkout real (un usuario puede editar
   localStorage manualmente; normalizarCarritoAlCargar() ya defiende la UI
   de esa manipulación, pero eso es solo higiene de interfaz, no
   seguridad/autoridad de datos). */
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

/* 🔥 CONFIG ENVÍO — ya estaba centralizada en un único lugar antes de
   Feature 05 (ver auditoría en el reporte de la feature): costo fijo de
   $150 MXN, gratis a partir de $2000 MXN de subtotal. Ningún otro archivo
   define esta regla por su cuenta; calcularEnvio() es el único punto que
   la consulta. Estos valores NO se inventaron ni se modificaron en
   Feature 05 — son exactamente los que ya regían el carrito.

   🔥 LIMITACIÓN CONOCIDA / FUTURO (Feature 05, punto 7): esta regla es un
   porcentaje/umbral simple sobre el subtotal, temporal hasta que exista
   backend. El costo de envío real deberá depender de variables logísticas
   por producto (peso, largo, ancho, alto, volumen, destino, transportista,
   servicio elegido) — no de un monto fijo. El panel administrativo futuro
   deberá permitir definir esos datos por producto (o un "shippingProfile"/
   clase de envío), y el backend será quien calcule y revalide el envío
   real; esta función seguirá siendo, como mucho, un estimado de UX en el
   frontend. No se modifica data/productos.js para inventar esos campos
   todavía. */
const CONFIG_ENVIO = {
    costo: 150,
    gratisDesde: 2000,
};

/* 🔥 Feature 02.6 — CONTROL DE CANTIDAD, STOCK Y LÍMITES DE COMPRA
   ==================================================================
   Todo lo de esta sección es validación de FRONTEND (UX): evita que
   el usuario arme un carrito con cantidades absurdas o imposibles.
   NO es la autoridad final. Cuando exista backend, el POST de pedido/
   checkout deberá revalidar de nuevo (producto existe, publicado,
   variante válida, stock, maxCompra, cantidad, precio) — el backend
   tendrá siempre la última palabra; esto de aquí no lo reemplaza.

   La arquitectura ya está preparada para stock por variante
   (product_variant) más adelante: toda la validación pasa por un único
   objeto "producto" con stock/disponible/maxCompra — el día que el
   stock viva en la variante en vez del producto, basta con pasar esa
   variante en su lugar; ninguna otra función necesita cambiar. */

/* Límite de compra por defecto cuando el producto no define su propio
   producto.maxCompra. Configurable en un único lugar (no hardcodeado
   repetido por toda la app). */
const MAX_CANTIDAD_POR_PRODUCTO_DEFAULT = 10;

/* 🔥 Config centralizada del flujo de WhatsApp para cotizar/consultar
   cantidades mayores al stock o al límite de compra. El número real
   TODAVÍA no está configurado (pendiente de la feature de WhatsApp) —
   se deja en null a propósito: no se inventa un número ficticio.
   construirMensajeWhatsApp()/generarLinkWhatsApp() quedan listos para
   usarse en cuanto exista un número real. */
const WHATSAPP_NUMERO = null; // TODO (Feature WhatsApp): configurar número real

function construirMensajeWhatsApp(producto, cantidadSolicitada, tipo = "cotizar") {
    if (tipo === "agotado") {
        return `Hola, quisiera consultar disponibilidad de ${producto.nombre}.`;
    }

    const partes = [`Hola, me interesa cotizar ${cantidadSolicitada} unidades de ${producto.nombre}.`];
    if (producto.sku) partes.push(`SKU: ${producto.sku}.`);
    if (producto.variante) partes.push(`Variante: ${producto.variante}.`);

    return partes.join(" ");
}

function generarLinkWhatsApp(mensaje) {
    if (!WHATSAPP_NUMERO) return null; // sin número real configurado todavía
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

/* Normaliza cualquier valor de cantidad a un entero >= 1. Cubre
   manipulación manual de localStorage/DevTools: NaN, Infinity,
   negativos, strings, decimales — nunca debe romper la UI/cálculos. */
function normalizarCantidad(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 1;
    return Math.max(1, Math.floor(numero));
}

/* Un producto se considera agotado si no está disponible o si su stock
   (numérico, finito) es <= 0. Cualquier stock no numérico/ausente se
   trata como "sin límite de stock conocido" (no agotado por esa vía),
   dejando que maxCompra siga aplicando. */
function estaAgotado(producto) {
    if (!producto) return true;
    if (producto.disponible === false) return true;

    const stock = Number(producto.stock);
    if (Number.isFinite(stock) && stock <= 0) return true;

    return false;
}

/* Cantidad máxima permitida para un producto = el menor entre su stock
   disponible y su máximo de compra (producto.maxCompra, o el límite
   global por defecto si el producto no define uno propio). */
function cantidadMaximaPermitida(producto) {
    if (!producto || estaAgotado(producto)) return 0;

    const stock = Number(producto.stock);
    const tieneStockNumerico = Number.isFinite(stock);

    const maxCompra = Number.isFinite(Number(producto.maxCompra))
        ? Number(producto.maxCompra)
        : MAX_CANTIDAD_POR_PRODUCTO_DEFAULT;

    return tieneStockNumerico ? Math.max(0, Math.min(stock, maxCompra)) : maxCompra;
}

/* 🔥 Punto ÚNICO de validación de cantidad. Lo usan: agregarAlCarrito()
   (card y modal, misma función — Feature 02.1), el botón "+" del panel
   del carrito, el selector de cantidad del modal, y la normalización al
   cargar el carrito. Ninguna otra parte de la app decide por su cuenta
   si una cantidad es válida.

   Devuelve { ok, cantidadFinal, motivo } donde motivo es:
   "ok" | "agotado" | "stock" | "limite" */
function validarCantidadProducto(producto, cantidadDeseada) {
    if (estaAgotado(producto)) {
        return { ok: false, cantidadFinal: 0, motivo: "agotado" };
    }

    const maxPermitido = cantidadMaximaPermitida(producto);
    const deseada = normalizarCantidad(cantidadDeseada);

    if (deseada > maxPermitido) {
        const stock = Number(producto.stock);
        const maxCompra = Number.isFinite(Number(producto.maxCompra))
            ? Number(producto.maxCompra)
            : MAX_CANTIDAD_POR_PRODUCTO_DEFAULT;

        // Si el stock es el factor más restrictivo, el mensaje es de stock;
        // si el límite de compra es igual o más restrictivo, es de límite.
        const motivo = Number.isFinite(stock) && stock <= maxCompra ? "stock" : "limite";

        return { ok: false, cantidadFinal: maxPermitido, motivo };
    }

    return { ok: true, cantidadFinal: deseada, motivo: "ok" };
}

/* Busca el producto en el catálogo ACTUAL por id (refleja el stock más
   reciente conocido por el frontend). Si ya no existe ahí, cae al
   snapshot guardado dentro del propio ítem del carrito, para no romper
   nada aunque el catálogo cambie. (Ver sección 18/19 del requerimiento:
   esto sigue siendo solo UX — el backend futuro es quien de verdad sabe
   la disponibilidad real en el momento del checkout.) */
function obtenerProductoActual(id) {
    if (typeof productos !== "undefined") {
        const actual = productos.find(p => p.id === id);
        if (actual) return actual;
    }
    return carrito.find(p => p.id === id);
}

/* Normaliza el carrito recién cargado de localStorage. Un usuario podría
   manipular manualmente la cantidad (DevTools/localStorage) a valores
   inválidos o absurdos (negativos, NaN, Infinity, strings, 999999999).
   Esto se corrige aquí, antes de cualquier render/cálculo, para que la
   UI y los totales nunca se rompan. Los ítems agotados NO se eliminan
   automáticamente (esa decisión queda para una futura feature de
   checkout) — solo se garantiza que su cantidad guardada sea un entero
   válido >= 1. */
function normalizarCarritoAlCargar() {
    let huboCambios = false;

    carrito = carrito.filter(item => item && typeof item.id !== "undefined");

    carrito.forEach(item => {
        const cantidadOriginal = item.cantidad;
        const productoActual = obtenerProductoActual(item.id) || item;

        let cantidad = normalizarCantidad(cantidadOriginal);

        if (!estaAgotado(productoActual)) {
            const maxPermitido = cantidadMaximaPermitida(productoActual);
            if (maxPermitido > 0) cantidad = Math.min(cantidad, maxPermitido);
        }

        if (cantidad !== cantidadOriginal) huboCambios = true;
        item.cantidad = cantidad;
    });

    if (huboCambios) guardarCarrito();
}

normalizarCarritoAlCargar();

function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

/* 🔥 Feature 06 (ajuste visual del botón carrito): el SIGNIFICADO del
   contador NO cambia — sigue siendo la suma de cantidades (unidades
   totales), no la cantidad de productos distintos/líneas, exactamente
   como ya funcionaba antes de esta feature.
   Lo único nuevo es presentación: (1) el texto visible se topa en "10+"
   para que el control nunca crezca de ancho de forma ilimitada con
   carritos grandes (el número real y completo sigue disponible en el
   aria-label para tecnología asistiva, sin topar en "10+"); (2) el
   aria-label del botón se vuelve dinámico y descriptivo en vez del
   aria-label genérico y estático que tenía antes.
   🔥 Corrección posterior: el aria-label decía "N productos", pero el
   contador representa UNIDADES totales, no productos distintos — con 2
   unidades del mismo producto, "2 productos" describía mal lo que hay
   en el carrito. Se corrige a "artículos", que no implica variedad de
   productos distintos, manteniendo intacto el significado numérico. */
function actualizarContador() {
    const contador = document.getElementById("cart-count");
    const boton = document.querySelector(".btn-cart");
    if (!contador) return;

    const total = carrito.reduce((acc, p) => acc + p.cantidad, 0);

    contador.textContent = total > 9 ? "10+" : String(total);

    if (boton) {
        let etiqueta;
        if (total === 0) {
            etiqueta = "Abrir carrito, vacío";
        } else if (total === 1) {
            etiqueta = "Abrir carrito, 1 artículo";
        } else {
            etiqueta = `Abrir carrito, ${total} artículos`;
        }
        boton.setAttribute("aria-label", etiqueta);
    }
}

/* 🔥 CALCULAR TOTAL PRODUCTOS */
function calcularTotal() {
    return carrito.reduce((acc, p) => acc + (Number(p.precio) * p.cantidad), 0);
}

/* 🔥 CALCULAR ENVÍO */
function calcularEnvio(totalProductos) {
    if (totalProductos >= CONFIG_ENVIO.gratisDesde) {
        return 0;
    }
    return CONFIG_ENVIO.costo;
}

/* 🔥 TOTAL FINAL */
function calcularTotalFinal() {
    const total = calcularTotal();
    const envio = calcularEnvio(total);
    return total + envio;
}

/* 🔥 AGREGAR PRODUCTO */
/* Punto común de la acción "agregar al carrito", usado tanto desde    */
/* la card del producto como desde el modal (Feature 02.1). El         */
/* parámetro "boton" es opcional: si se recibe, ese botón también      */
/* recibe el feedback visual temporal (AGREGADO ✓).                    */
/* "cantidadAAgregar" (Feature 02.6): 1 desde la card (comportamiento   */
/* de siempre); la cantidad elegida en el selector del modal cuando     */
/* se agrega desde ahí. Toda la validación pasa por                     */
/* validarCantidadProducto() — la misma regla para card, modal y        */
/* botón "+" del carrito, nunca una regla distinta por origen.          */
function agregarAlCarrito(producto, boton, cantidadAAgregar = 1) {
    if (estaAgotado(producto)) {
        mostrarToast(null, { tipo: "agotado", producto });
        return;
    }

    const existente = carrito.find(p => p.id === producto.id);
    const cantidadActual = existente ? existente.cantidad : 0;
    const resultado = validarCantidadProducto(producto, cantidadActual + normalizarCantidad(cantidadAAgregar));

    if (!resultado.ok) {
        // Ya estaba en el máximo permitido (stock o límite de compra):
        // no se agrega nada, solo se informa por qué.
        mostrarToast(null, { tipo: resultado.motivo, producto });
        return;
    }

    if (existente) {
        existente.cantidad = resultado.cantidadFinal;
    } else {
        // Se guarda un snapshot del producto (incluye stock/maxCompra/
        // disponible tal como estaban al agregarlo) junto a la cantidad.
        carrito.push({ ...producto, cantidad: resultado.cantidadFinal });
    }

    guardarCarrito();
    actualizarContador();
    renderCarrito();

    mostrarToast(producto.nombre, { tipo: "exito" });
    if (boton) marcarBotonComoAgregado(boton);
}

/* 🔥 TOAST DE FEEDBACK — un único toast reutilizado (Feature 02.1),   */
/* ahora también usado para los mensajes de stock/límite/agotado       */
/* (Feature 02.6). Si el usuario dispara varios mensajes rápido, se    */
/* actualiza el texto y se reinicia el temporizador en vez de apilar   */
/* notificaciones — nunca alert()/confirm()/prompt().                  */
/* "opciones.tipo": "exito" (por defecto) | "agotado" | "stock" | "limite" */
let toastTimeoutId = null;

function mostrarToast(nombreProducto, opciones = {}) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    const tipo = opciones.tipo || "exito";
    const producto = opciones.producto;

    let html;

    switch (tipo) {
        case "agotado":
            html = `
                <strong>Producto agotado</strong>
                <span>Este producto no se encuentra disponible por el momento.</span>
            `;
            break;

        case "stock": {
            const stock = producto ? Number(producto.stock) : NaN;
            const textoStock = Number.isFinite(stock)
                ? `Solo hay ${stock} unidad${stock === 1 ? "" : "es"} disponible${stock === 1 ? "" : "s"}.`
                : "Has alcanzado el stock disponible.";

            html = `
                <strong>${textoStock}</strong>
                <span>Para solicitar una cantidad mayor, contáctanos por WhatsApp.</span>
            `;
            break;
        }

        case "limite":
            html = `
                <strong>Límite de compra alcanzado</strong>
                <span>Para solicitar una cantidad mayor, contáctanos por WhatsApp.</span>
            `;
            break;

        // 🔥 Feature 06: mensaje informativo genérico y breve, reutilizable
        // (por ahora lo usa el enlace "Ofertas" del header cuando todavía
        // no existe un modelo real de ofertas). No participa en ninguna
        // regla de stock/carrito — es solo texto, provisto siempre por
        // quien llama, nunca inventado aquí.
        case "info":
            html = `<strong>${opciones.mensaje || ""}</strong>`;
            break;

        case "exito":
        default:
            html = `
                <strong>${nombreProducto} se agregó al carrito</strong>
                <span>Ya puedes seguir comprando.</span>
            `;
            break;
    }

    toast.innerHTML = html;
    toast.classList.add("toast--visible");

    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => {
        toast.classList.remove("toast--visible");
        toastTimeoutId = null;
    }, 2500);
}

/* 🔥 FEEDBACK TEMPORAL DEL BOTÓN (AGREGAR → AGREGADO ✓ → AGREGAR).   */
/* No deshabilita el botón: solo cambia texto/clase por ~1.2s.        */
/* Si se hace clic varias veces seguidas, reinicia su propio          */
/* temporizador en vez de dejar timers superpuestos.                  */
function marcarBotonComoAgregado(boton) {
    boton.textContent = "AGREGADO ✓";
    boton.classList.add("agregado");

    if (boton._feedbackTimeoutId) clearTimeout(boton._feedbackTimeoutId);
    boton._feedbackTimeoutId = setTimeout(() => {
        boton.textContent = "AGREGAR";
        boton.classList.remove("agregado");
        boton._feedbackTimeoutId = null;
    }, 1200);
}

/* 🔥 Feature 05: formato monetario consistente en TODO el carrito
   ($199 MXN, $1,990 MXN, $13,978 MXN). Reutiliza exactamente la misma
   función que ya usa el modal de producto desde Feature 02.7
   (formatearPrecioMXN, definida en js/app.js) — un solo formateador para
   toda la tienda, en vez de tener dos que puedan desincronizarse. Es
   presentación pura: los valores numéricos (precio, subtotal, envío,
   total) nunca se convierten a string antes de usarse en un cálculo. */

/* 🔥 RENDER DEL CARRITO */
function renderCarrito() {
    const contenedor = document.getElementById("cart-items");
    const resumenContainer = document.getElementById("cart-summary");

    if (!contenedor) return;

    contenedor.innerHTML = "";

    // 🔥 Feature 05 (punto 17): estado vacío explícito, minimalista, sin
    // ilustraciones externas.
    if (carrito.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "cart-empty";
        vacio.innerHTML = `
            <p class="cart-empty__titulo">Tu carrito está vacío.</p>
            <p class="cart-empty__texto">Agrega productos para verlos aquí.</p>
        `;
        contenedor.appendChild(vacio);

        if (resumenContainer) {
            resumenContainer.innerHTML = "";
            resumenContainer.hidden = true;
        }
        return;
    }

    if (resumenContainer) resumenContainer.hidden = false;

    carrito.forEach((prod, indice) => {
        const item = document.createElement("div");
        item.classList.add("cart-item");
        // 🔥 Feature 05 (punto 2): separador discreto entre productos —
        // el último no lleva línea (evita un borde colgando al final de
        // la lista).
        if (indice === carrito.length - 1) item.classList.add("cart-item--last");

        const subtotal = Number(prod.precio) * prod.cantidad;

        // 🔥 Feature 02.6 (sin cambios de lógica): "-" se deshabilita en
        // el mínimo (1) porque ahí no hace falta explicar nada — para
        // quitar el producto existe ELIMINAR. "+" NUNCA se deshabilita al
        // llegar al tope: un botón disabled no dispara click en el
        // navegador, y el caso obligatorio es justamente que al intentar
        // sumar en el tope se vea el mensaje ("Solo hay X disponibles" /
        // "Límite de compra alcanzado") — eso requiere que el clic sí
        // llegue a sumar(), que es quien valida y muestra el toast a
        // través de validarCantidadProducto().
        const enElMinimo = prod.cantidad <= 1;

        item.innerHTML = `
            <div class="cart-item__info">
                <img src="${prod.imagen}" alt="${prod.nombre}" loading="lazy" decoding="async" />

                <div class="cart-item__text">
                    <strong class="cart-item__nombre">${prod.nombre}</strong>
                    <p class="cart-price">${formatearPrecioMXN(prod.precio)}</p>
                </div>
            </div>

            <div class="cart-item__aside">
                <div class="cart-item__controls">
                    <button type="button" class="cart-item__qty-btn" data-action="restar" data-id="${prod.id}" aria-label="Disminuir cantidad de ${prod.nombre}" ${enElMinimo ? "disabled" : ""}>&minus;</button>
                    <span class="cart-item__qty-value">${prod.cantidad}</span>
                    <button type="button" class="cart-item__qty-btn" data-action="sumar" data-id="${prod.id}" aria-label="Aumentar cantidad de ${prod.nombre}">+</button>
                    <button type="button" class="cart-item__remove" data-action="eliminar" data-id="${prod.id}" aria-label="Eliminar ${prod.nombre} del carrito">🗑</button>
                </div>

                <p class="cart-subtotal">${formatearPrecioMXN(subtotal)}</p>
            </div>
        `;

        contenedor.appendChild(item);
    });

    /* 🔥 RESUMEN (punto 4): "Productos" -> "Subtotal" (es realmente la
       suma antes de envío); el Total gana jerarquía visual vía CSS
       (scss/_cart.scss). No se tocan calcularTotal/calcularEnvio/
       calcularTotalFinal — solo cómo se muestran sus resultados. */
    if (resumenContainer) {
        const total = calcularTotal();
        const envio = calcularEnvio(total);
        const totalFinal = calcularTotalFinal();

        resumenContainer.innerHTML = `
            <div class="cart-summary__row">
                <span>Subtotal</span>
                <strong>${formatearPrecioMXN(total)}</strong>
            </div>

            <div class="cart-summary__row">
                <span>Envío</span>
                <strong>${envio === 0 ? "GRATIS" : formatearPrecioMXN(envio)}</strong>
            </div>

            <div class="cart-summary__row cart-summary__row--total">
                <span>Total</span>
                <strong>${formatearPrecioMXN(totalFinal)}</strong>
            </div>
        `;
    }
}

/* 🔥 CONTROLES (Feature 02.6: ahora con validación de stock/límite) */
function sumar(id) {
    const prod = carrito.find(p => p.id === id);
    if (!prod) return;

    const productoActual = obtenerProductoActual(id) || prod;
    const resultado = validarCantidadProducto(productoActual, prod.cantidad + 1);

    if (!resultado.ok) {
        mostrarToast(null, { tipo: resultado.motivo, producto: productoActual });
        return;
    }

    prod.cantidad = resultado.cantidadFinal;
    guardarCarrito();
    renderCarrito();
    actualizarContador();
}

/* Cantidad mínima dentro del carrito = 1. El botón "-" nunca baja a 0:
   para quitar el producto existe la acción ELIMINAR. (El botón queda
   además deshabilitado en el render cuando cantidad === 1, esto es un
   segundo resguardo, no el único mecanismo.) */
function restar(id) {
    const prod = carrito.find(p => p.id === id);
    if (!prod) return;

    if (prod.cantidad <= 1) return;

    prod.cantidad--;
    guardarCarrito();
    renderCarrito();
    actualizarContador();
}

function eliminar(id) {
    carrito = carrito.filter(p => p.id !== id);
    guardarCarrito();
    renderCarrito();
    actualizarContador();
}

/* 🔥 DELEGACIÓN DE EVENTOS (sumar/restar/eliminar) */
/* Un único listener sobre el contenedor estable #cart-items.       */
/* No se registra en cada renderCarrito(): el contenedor ya existe  */
/* en el DOM antes de este script (script al final del body).       */
const contenedorCarrito = document.getElementById("cart-items");

if (contenedorCarrito) {
    contenedorCarrito.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const id = Number(btn.dataset.id);
        const accion = btn.dataset.action;

        if (accion === "sumar") sumar(id);
        else if (accion === "restar") restar(id);
        else if (accion === "eliminar") eliminar(id);
    });
}

/* La inicialización (actualizarContador/renderCarrito) queda a cargo   */
/* del DOMContentLoaded de app.js, que ya la ejecuta. Se elimina aquí   */
/* la inicialización duplicada que existía en este archivo.            */

/* ==================================================================
   🔥 Feature 05 — CARRITO: RESPONSIVE + ACCESIBILIDAD
   ==================================================================
   Decisión de arquitectura (punto 8/9/10 del requerimiento):

   - DESKTOP (> 1024px): el carrito es un panel LATERAL, NO modal. NO se
     bloquea el scroll del fondo, NO se aplica inert, NO hay focus trap,
     NO se fuerza el foco al abrir. El usuario puede seguir navegando,
     agregando productos y viendo el carrito actualizarse en vivo sin
     cerrarlo (punto 16/19).

   - TABLET/MOBILE (<= 1024px): el carrito se comporta como un DRAWER
     MODAL — mismo patrón que el modal de producto (Feature 03): fondo
     bloqueado (scroll-lock + inert), focus trap, Escape cierra, foco
     inicial en CERRAR, devolución de foco al cerrar.

   Se eligió 1024px (no el único breakpoint de 768px que ya usa el resto
   del proyecto) porque el requerimiento pide EXPLÍCITAMENTE que 768px
   (tablet) se comporte como modal igual que mobile, y que recién en
   1366px/1920px (desktop) sea panel lateral — ningún breakpoint ya
   existente en el proyecto separa esos dos grupos; 1024px es el punto
   intermedio razonable entre 768 (debe seguir siendo modal) y 1366 (debe
   ser lateral), documentado aquí como decisión nueva y explícita de esta
   feature.

   matchMedia (no un simple listener de "resize") para reaccionar
   exactamente cuando se cruza ese breakpoint, sin recalcular en cada
   pixel de un resize. */
const MEDIA_QUERY_CARRITO_MODAL = window.matchMedia("(max-width: 1024px)");

function modoCarritoEsModal() {
    return MEDIA_QUERY_CARRITO_MODAL.matches;
}

// Elemento que disparó la apertura (para devolver el foco al cerrar,
// igual que elementoOrigenModal en js/app.js) y lista de elementos del
// fondo puestos en inert mientras el carrito funciona como drawer modal.
let elementoOrigenCarrito = null;
let elementosInertadosCarrito = [];

const cartPanelEl = document.getElementById("cart-panel");
const cartOverlayEl = document.getElementById("cart-overlay");
const cartCloseBtn = document.getElementById("close-cart");
const cartTitleId = "cart-title";

/* Aplica/actualiza los atributos ARIA del carrito según el modo actual.
   Se llama al abrir y también al cruzar el breakpoint con el carrito ya
   abierto (punto 11: resize). En desktop NO se declara aria-modal="true"
   — el resto de la tienda sigue siendo interactivo de verdad, decirle a
   tecnología asistiva que es un diálogo modal sería incorrecto (punto 18:
   "utilizar una semántica adecuada de panel/región complementaria"). */
function actualizarSemanticaCarrito() {
    if (!cartPanelEl) return;

    if (modoCarritoEsModal()) {
        cartPanelEl.setAttribute("role", "dialog");
        cartPanelEl.setAttribute("aria-modal", "true");
        cartPanelEl.setAttribute("aria-labelledby", cartTitleId);
    } else {
        cartPanelEl.removeAttribute("aria-modal");
        cartPanelEl.setAttribute("role", "region");
        cartPanelEl.setAttribute("aria-labelledby", cartTitleId);
    }
}

/* Focus trap + Escape, análogos a manejarTeclasModal()/
   obtenerFocosablesModal() de js/app.js (Feature 03), pero acotados a
   #cart-panel y activos SOLO cuando el carrito está abierto Y funciona
   en modo modal (tablet/mobile). En desktop este handler no hace nada:
   el carrito no atrapa el foco ahí. */
function obtenerFocosablesCarrito() {
    if (!cartPanelEl) return [];

    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const candidatos = Array.from(cartPanelEl.querySelectorAll(selector));

    return candidatos.filter((el) => {
        if (el.hidden || el.closest("[hidden]")) return false;
        const estilo = window.getComputedStyle(el);
        if (estilo.display === "none" || estilo.visibility === "hidden") return false;
        return el.offsetParent !== null || el === document.activeElement;
    });
}

function manejarTeclasCarrito(e) {
    if (!cartPanelEl || !cartPanelEl.classList.contains("active")) return;
    if (!modoCarritoEsModal()) return; // en desktop no hay trap ni Escape propio del carrito

    if (e.key === "Escape") {
        e.preventDefault();
        cerrarCarrito();
        return;
    }

    if (e.key !== "Tab") return;

    const focosables = obtenerFocosablesCarrito();
    if (focosables.length === 0) {
        e.preventDefault();
        return;
    }

    const primero = focosables[0];
    const ultimo = focosables[focosables.length - 1];
    const activo = document.activeElement;
    const focoDentro = cartPanelEl.contains(activo);

    if (e.shiftKey) {
        if (!focoDentro || activo === primero) {
            e.preventDefault();
            ultimo.focus();
        }
    } else {
        if (!focoDentro || activo === ultimo) {
            e.preventDefault();
            primero.focus();
        }
    }
}

if (cartPanelEl) {
    cartPanelEl.addEventListener("keydown", manejarTeclasCarrito);
}

/* inert del fondo — mismo patrón que aplicarInertFondo()/
   quitarInertFondo() del modal de producto (js/app.js, Feature 03), pero
   excluyendo #cart-panel (en vez de #product-modal) y siempre excluyendo
   #toast para que el toast de feedback (AGREGADO ✓ / stock / límite)
   siga siendo anunciado por tecnología asistiva mientras el carrito está
   abierto en modo modal (punto 20 — no duplicar la corrección de
   Feature 03, replicar exactamente el mismo criterio). No se reutiliza
   literalmente la función del modal porque excluye un elemento distinto
   (el modal de producto, no el carrito); son dos regiones "modales"
   independientes que pueden convivir (punto 19). */
function aplicarInertFondoCarrito() {
    elementosInertadosCarrito = Array.from(document.body.children).filter(
        (el) => el !== cartPanelEl && el.id !== "toast" && el.tagName !== "SCRIPT"
    );

    elementosInertadosCarrito.forEach((el) => {
        if ("inert" in el) {
            el.inert = true;
        } else {
            const previo = el.getAttribute("aria-hidden");
            if (previo !== null) el.setAttribute("data-aria-hidden-previo-carrito", previo);
            el.setAttribute("aria-hidden", "true");
        }
    });
}

function quitarInertFondoCarrito() {
    elementosInertadosCarrito.forEach((el) => {
        if ("inert" in el) {
            el.inert = false;
        } else {
            const previo = el.getAttribute("data-aria-hidden-previo-carrito");
            if (previo !== null) {
                el.setAttribute("aria-hidden", previo);
                el.removeAttribute("data-aria-hidden-previo-carrito");
            } else {
                el.removeAttribute("aria-hidden");
            }
        }
    });
    elementosInertadosCarrito = [];
}

/* Punto único de apertura del carrito. "origen" es el elemento que
   disparó la apertura (normalmente el botón del carrito en el header),
   para poder devolverle el foco al cerrar. */
function abrirCarrito(origen) {
    if (!cartPanelEl) return;

    elementoOrigenCarrito = origen || document.activeElement || null;

    renderCarrito();
    cartPanelEl.classList.add("active");
    actualizarSemanticaCarrito();

    if (modoCarritoEsModal()) {
        bloquearScrollFondo();
        aplicarInertFondoCarrito();
        if (cartOverlayEl) cartOverlayEl.classList.add("active");

        // Foco inicial en CERRAR (punto 18) — solo tiene sentido forzarlo
        // en modo modal; en desktop el carrito no "roba" el foco de la
        // tienda.
        if (cartCloseBtn) cartCloseBtn.focus();
    }
}

/* Punto único de cierre del carrito. Todos los caminos (botón X, clic en
   el overlay, Escape) deben llamar exclusivamente a esta función — mismo
   principio que cerrarModal() en js/app.js (Feature 03: "no duplicar
   lógica de cierre"). */
function cerrarCarrito() {
    if (!cartPanelEl) return;

    cartPanelEl.classList.remove("active");

    if (cartOverlayEl) cartOverlayEl.classList.remove("active");
    desbloquearScrollFondo();
    quitarInertFondoCarrito();

    // Devuelve el foco al elemento que abrió el carrito (punto 18), con
    // resguardo seguro si ya no existe en el DOM — nunca genera errores.
    if (elementoOrigenCarrito && document.body.contains(elementoOrigenCarrito) && typeof elementoOrigenCarrito.focus === "function") {
        elementoOrigenCarrito.focus();
    }
    elementoOrigenCarrito = null;
}

/* 🔥 Punto 11 — RESIZE/ROTACIÓN CON CARRITO ABIERTO.
   Si el carrito está abierto y el viewport cruza el breakpoint mientras
   tanto (desktop -> mobile/tablet o viceversa), el modo debe
   reconciliarse: nunca debe quedar scroll-lock/inert/focus-trap activo
   en desktop, ni el carrito abierto en mobile/tablet sin bloquear el
   fondo. */
MEDIA_QUERY_CARRITO_MODAL.addEventListener("change", () => {
    if (!cartPanelEl || !cartPanelEl.classList.contains("active")) return;

    actualizarSemanticaCarrito();

    if (modoCarritoEsModal()) {
        // Pasó a modo modal (venía de desktop): aplicar lo que faltaba.
        bloquearScrollFondo();
        aplicarInertFondoCarrito();
        if (cartOverlayEl) cartOverlayEl.classList.add("active");
    } else {
        // Pasó a modo panel lateral (venía de modal): liberar todo lo
        // que el modo modal había bloqueado, sin dejar residuos.
        desbloquearScrollFondo();
        quitarInertFondoCarrito();
        if (cartOverlayEl) cartOverlayEl.classList.remove("active");
    }
});

/* Apertura/cierre: botón del header, botón X, y overlay (solo visible/
   interactivo en modo modal — en desktop está siempre oculto vía CSS, así
   que un clic ahí nunca puede ocurrir). */
const cartTriggerBtn = document.querySelector(".btn-cart");

if (cartTriggerBtn) {
    cartTriggerBtn.addEventListener("click", () => abrirCarrito(cartTriggerBtn));
}

if (cartCloseBtn) {
    cartCloseBtn.addEventListener("click", () => cerrarCarrito());
}

if (cartOverlayEl) {
    cartOverlayEl.addEventListener("click", () => cerrarCarrito());
}

// Semántica correcta desde el primer render, incluso antes de abrirlo.
actualizarSemanticaCarrito();