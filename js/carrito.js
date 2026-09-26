let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

/* 🔥 CONFIG ENVÍO */
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

function actualizarContador() {
    const contador = document.getElementById("cart-count");
    if (!contador) return;

    const total = carrito.reduce((acc, p) => acc + p.cantidad, 0);
    contador.textContent = total;
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

/* 🔥 RENDER DEL CARRITO */
function renderCarrito() {
    const contenedor = document.getElementById("cart-items");
    const totalContainer = document.getElementById("cart-total");

    if (!contenedor) return;

    contenedor.innerHTML = "";

    carrito.forEach(prod => {
        const item = document.createElement("div");
        item.classList.add("cart-item");

        const subtotal = Number(prod.precio) * prod.cantidad;

        // 🔥 Feature 02.6: "-" se deshabilita en el mínimo (1) porque ahí no
        // hace falta explicar nada — para quitar el producto existe
        // ELIMINAR. "+" NUNCA se deshabilita al llegar al tope: un botón
        // disabled no dispara click en el navegador, y el caso obligatorio
        // es justamente que al intentar sumar en el tope se vea el mensaje
        // ("Solo hay X disponibles" / "Límite de compra alcanzado") — eso
        // requiere que el clic sí llegue a sumar(), que es quien valida y
        // muestra el toast a través de validarCantidadProducto().
        const enElMinimo = prod.cantidad <= 1;

        item.innerHTML = `
            <div class="cart-item__info">
                <img src="${prod.imagen}" alt="${prod.nombre}" />

                <div class="cart-item__text">
                    <strong>${prod.nombre}</strong>
                    <p class="cart-price">$${prod.precio}</p>
                    <p class="cart-subtotal">$${subtotal}</p>
                </div>
            </div>

            <div class="cart-item__controls">
                <button data-action="restar" data-id="${prod.id}" aria-label="Disminuir cantidad de ${prod.nombre}" ${enElMinimo ? "disabled" : ""}>-</button>
                <span>${prod.cantidad}</span>
                <button data-action="sumar" data-id="${prod.id}" aria-label="Aumentar cantidad de ${prod.nombre}">+</button>
                <button data-action="eliminar" data-id="${prod.id}" aria-label="Eliminar ${prod.nombre} del carrito">🗑</button>
            </div>
        `;

        contenedor.appendChild(item);
    });

    /* 🔥 TOTALES */
    if (totalContainer) {
        const total = calcularTotal();
        const envio = calcularEnvio(total);
        const totalFinal = calcularTotalFinal();

        totalContainer.innerHTML = `
            <div>
                <span>Productos:</span>
                <strong>$${total}</strong>
            </div>

            <div>
                <span>Envío:</span>
                <strong>${envio === 0 ? "GRATIS" : "$" + envio}</strong>
            </div>

            <hr/>

            <div>
                <span>Total:</span>
                <strong>$${totalFinal}</strong>
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