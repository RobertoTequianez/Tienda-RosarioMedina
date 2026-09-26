let categoriaActual = "all";

// PRODUCTO SELECCIONADO
let productoSeleccionado = null;

// CARRUSEL
let imagenActual = 0;
let listaImagenes = [];

// MODAL
let modal;
let modalTrack; // .modal__track: único elemento que hace scroll (carrusel DOM real)
let modalTitle;
let modalPrice;
let modalDesc;
let closeModal;

// BOTÓN MODAL
let modalBtn;

// FLECHAS Y DOTS (controles del carrusel del modal)
let modalControls; // .modal__controls: contenedor de flechas + dots
let modalDots; // .modal__dots: contenedor de los indicadores de posición
let btnLeft;
let btnRight;

// SCROLL LOCK DEL FONDO (Feature 02.4)
// Guarda la posición exacta de scroll de la página al abrir el modal,
// para poder restaurarla al cerrar. Es el único estado que necesita
// sobrevivir entre abrirModal() y cerrarModal().
let scrollYGuardado = 0;

// SELECTOR DE CANTIDAD DEL MODAL (Feature 02.6)
let modalQty; // .modal__qty: contenedor del selector [-] cantidad [+]
let modalQtyMinus;
let modalQtyPlus;
let modalQtyValue;
let cantidadSeleccionadaModal = 1; // cantidad a agregar cuando se presiona AGREGAR desde el modal

document.addEventListener("DOMContentLoaded", () => {
    modal = document.getElementById("product-modal");
    modalTrack = document.getElementById("modal-track");
    modalTitle = document.getElementById("modal-title");
    modalPrice = document.getElementById("modal-price");
    modalDesc = document.getElementById("modal-description");
    closeModal = document.getElementById("close-modal");
    modalBtn = document.getElementById("modal-add");
    modalControls = document.getElementById("modal-controls");
    modalDots = document.getElementById("modal-dots");
    btnLeft = document.querySelector(".modal__arrow--left");
    btnRight = document.querySelector(".modal__arrow--right");
    modalQty = document.getElementById("modal-qty");
    modalQtyMinus = document.getElementById("modal-qty-minus");
    modalQtyPlus = document.getElementById("modal-qty-plus");
    modalQtyValue = document.getElementById("modal-qty-value");

    if (btnLeft && btnRight) {
        btnLeft.addEventListener("click", (e) => {
            e.stopPropagation();
            if (listaImagenes.length <= 1) return;

            imagenActual = (imagenActual - 1 + listaImagenes.length) % listaImagenes.length;
            desplazarCarruselA(imagenActual);
            actualizarDotsActivos();
        });

        btnRight.addEventListener("click", (e) => {
            e.stopPropagation();
            if (listaImagenes.length <= 1) return;

            imagenActual = (imagenActual + 1) % listaImagenes.length;
            desplazarCarruselA(imagenActual);
            actualizarDotsActivos();
        });
    }

    // Mantiene imagenActual (y los dots) sincronizados cuando el usuario
    // desliza el carrusel manualmente (swipe táctil / scroll con mouse),
    // para que flechas y dots sigan reflejando la imagen visible real.
    // Es el único índice que existe: no se mantiene un contador aparte.
    if (modalTrack) {
        modalTrack.addEventListener("scroll", () => {
            const ancho = modalTrack.clientWidth;
            if (!ancho || listaImagenes.length <= 1) return;

            imagenActual = Math.round(modalTrack.scrollLeft / ancho);
            actualizarDotsActivos();
        });
    }

    if (modalBtn) {
        modalBtn.addEventListener("click", () => {
            // modalBtn.disabled ya impide el click del navegador cuando el
            // producto está agotado (actualizarEstadoAgregarModal); esta
            // comprobación es un resguardo adicional, no el único mecanismo.
            if (!productoSeleccionado || modalBtn.disabled) return;

            agregarAlCarrito(productoSeleccionado, modalBtn, cantidadSeleccionadaModal);
            cerrarModal();
        });
    }

    // 🔥 Feature 02.6: selector de cantidad del modal. El tope se recalcula
    // en cada clic (no queda fijo al abrir), porque el carrito pudo cambiar
    // mientras el modal está abierto (p. ej. se agregó desde otra pestaña/
    // acción). Toda la regla de "cuánto se puede agregar" vive en
    // cantidadMaximaPermitida()/validarCantidadProducto() (js/carrito.js) —
    // aquí solo se usa, no se reimplementa.
    if (modalQtyMinus) {
        modalQtyMinus.addEventListener("click", () => {
            if (cantidadSeleccionadaModal > 1) {
                cantidadSeleccionadaModal--;
                actualizarSelectorCantidadModal();
            }
        });
    }

    if (modalQtyPlus) {
        modalQtyPlus.addEventListener("click", () => {
            if (!productoSeleccionado) return;

            const existente = carrito.find(p => p.id === productoSeleccionado.id);
            const cantidadEnCarrito = existente ? existente.cantidad : 0;
            const maxPermitido = cantidadMaximaPermitida(productoSeleccionado);
            const maxDisponibleParaAgregar = Math.max(0, maxPermitido - cantidadEnCarrito);

            if (cantidadSeleccionadaModal < maxDisponibleParaAgregar) {
                cantidadSeleccionadaModal++;
                actualizarSelectorCantidadModal();
                return;
            }

            // Ya no se puede seleccionar más: se reutiliza la misma
            // validación central (validarCantidadProducto) para decidir
            // si el mensaje es de stock o de límite de compra — ninguna
            // regla nueva/distinta aquí, solo se consulta el motivo.
            const resultado = validarCantidadProducto(
                productoSeleccionado,
                cantidadEnCarrito + cantidadSeleccionadaModal + 1
            );
            mostrarToast(null, { tipo: resultado.motivo, producto: productoSeleccionado });
        });
    }

    if (closeModal) {
        closeModal.addEventListener("click", () => {
            cerrarModal();
        });

        window.addEventListener("click", (e) => {
            if (e.target === modal) {
                cerrarModal();
            }
        });
    }

    renderProductos();
    activarFiltros();

    actualizarContador();
    renderCarrito();
});

/* CREAR CARD */
function crearCard(producto) {
    const card = document.createElement("div");
    card.classList.add("product-card");

    // 🔥 Feature 02.6: producto agotado → botón AGOTADO, con el atributo
    // "disabled" real (no solo apariencia por CSS), para que el navegador
    // ni siquiera dispare el evento click.
    const agotado = estaAgotado(producto);

    card.innerHTML = `
        <div class="product-card__image">
            <img src="${producto.imagen}" alt="${producto.nombre}">
        </div>

        <div class="product-card__info">
            <h3 class="product-card__title">${producto.nombre}</h3>
            <p class="product-card__price">$${producto.precio}</p>

            <button class="product-card__btn"${agotado ? " disabled" : ""}>${agotado ? "AGOTADO" : "AGREGAR"}</button>
        </div>
    `;

    const btn = card.querySelector(".product-card__btn");

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        agregarAlCarrito(producto, btn);
    });

    // El producto agotado sigue siendo visible y se puede abrir su modal
    // (para informar al usuario) — solo el botón AGREGAR queda bloqueado.
    card.addEventListener("click", () => {
        abrirModal(producto);
    });

    return card;
}

/* MODAL */
// Punto único de apertura. Cualquier código nuevo que deba ejecutarse al
// abrir el modal (incluido el bloqueo de scroll del fondo) se agrega aquí,
// nunca en un caller individual.
function abrirModal(producto) {
    bloquearScrollFondo();

    modal.classList.add("active");

    productoSeleccionado = producto;

    // CARRUSEL
    listaImagenes = producto.imagenes || [producto.imagen];
    imagenActual = 0;

    renderCarruselModal(producto.nombre);

    modalTitle.textContent = producto.nombre;
    modalPrice.textContent = `$${producto.precio}`;
    modalDesc.textContent = producto.descripcion || "Producto premium.";

    // 🔥 Feature 02.6: estado de stock/cantidad, siempre reseteado al abrir
    // (nunca debe arrastrar el "AGREGADO ✓"/cantidad de una apertura previa,
    // sea del mismo producto o de otro).
    if (modalBtn._feedbackTimeoutId) {
        clearTimeout(modalBtn._feedbackTimeoutId);
        modalBtn._feedbackTimeoutId = null;
    }
    modalBtn.classList.remove("agregado");
    cantidadSeleccionadaModal = 1;

    actualizarEstadoAgregarModal();
}

/* 🔥 Feature 02.6: refleja en el modal si el producto está agotado
   (botón AGREGAR → "AGOTADO", disabled=true, selector de cantidad
   oculto) o disponible (selector visible, botón habilitado con su
   tope recalculado). Se llama al abrir el modal. */
function actualizarEstadoAgregarModal() {
    if (!productoSeleccionado || !modalBtn) return;

    const agotado = estaAgotado(productoSeleccionado);

    if (agotado) {
        modalBtn.disabled = true;
        modalBtn.textContent = "AGOTADO";
        if (modalQty) modalQty.style.display = "none";
        return;
    }

    modalBtn.disabled = false;
    modalBtn.textContent = "AGREGAR";
    if (modalQty) modalQty.style.display = "";

    actualizarSelectorCantidadModal();
}

/* Recalcula y refleja en el DOM el estado del selector [-] cantidad [+]
   del modal: valor actual, y si cada flecha debe estar disabled según
   cuánto quede disponible para agregar (stock/maxCompra menos lo que ya
   hay en el carrito). Nunca deja la cantidad seleccionada en 0: el
   mínimo visible siempre es 1, aunque no quede margen para agregar más
   (en ese caso "+" queda disabled y el intento de AGREGAR se resuelve,
   como siempre, vía validarCantidadProducto()). */
function actualizarSelectorCantidadModal() {
    if (!productoSeleccionado) return;

    const existente = carrito.find(p => p.id === productoSeleccionado.id);
    const cantidadEnCarrito = existente ? existente.cantidad : 0;
    const maxPermitido = cantidadMaximaPermitida(productoSeleccionado);
    const maxDisponibleParaAgregar = Math.max(0, maxPermitido - cantidadEnCarrito);

    const topeSelector = Math.max(1, maxDisponibleParaAgregar);
    if (cantidadSeleccionadaModal > topeSelector) cantidadSeleccionadaModal = topeSelector;
    if (cantidadSeleccionadaModal < 1) cantidadSeleccionadaModal = 1;

    if (modalQtyValue) modalQtyValue.textContent = cantidadSeleccionadaModal;
    if (modalQtyMinus) {
        // "-" sí se deshabilita en el mínimo (1): no hace falta mensaje,
        // no hay acción de "quitar" en este selector (eso es ELIMINAR,
        // ya en el carrito).
        modalQtyMinus.disabled = cantidadSeleccionadaModal <= 1;
        modalQtyMinus.setAttribute("aria-label", `Disminuir cantidad de ${productoSeleccionado.nombre}`);
    }
    if (modalQtyPlus) {
        // "+" NUNCA se deshabilita por tope (ver su click handler): debe
        // seguir siendo clickeable para que se muestre el mensaje de
        // stock/límite al intentar pasarse.
        modalQtyPlus.setAttribute("aria-label", `Aumentar cantidad de ${productoSeleccionado.nombre}`);
    }
}

// Punto único de cierre. TODOS los caminos que cierran el modal (botón X,
// clic fuera/overlay, botón AGREGAR del modal, y en el futuro la tecla
// Escape de Feature 03) deben llamar exclusivamente a esta función, para
// que el desbloqueo del scroll del fondo nunca pueda quedar desincronizado
// de alguno de esos caminos. Nunca debe quedar el body bloqueado tras
// cerrar el modal por cualquier vía.
function cerrarModal() {
    modal.classList.remove("active");
    desbloquearScrollFondo();
}

// BLOQUEO DE SCROLL DEL FONDO (Feature 02.4)
//
// Estrategia elegida: "fixed body con compensación de scrollbar".
// Es la más simple y robusta para este proyecto vanilla (sin dependencias):
//
//   1. Guardar window.scrollY exacto antes de bloquear.
//   2. Medir el ancho de la scrollbar del navegador ANTES de ocultarla
//      (innerWidth - clientWidth), para poder compensarlo.
//   3. Fijar <body> con position:fixed y top:-scrollY, de forma que el
//      contenido quede visualmente en el mismo lugar pero deje de poder
//      desplazarse (no es un simple overflow:hidden: eso por sí solo no
//      evita el "scroll bounce" en iOS ni el salto de posición).
//   4. Compensar el padding-right en body y en el header (que también es
//      position:fixed) por el ancho que libera la scrollbar al ocultarse,
//      evitando el salto lateral de layout.
//
// El modal en sí (.modal, position:fixed, z-index por encima de todo) no
// se ve afectado por que <body> esté fijo: sigue centrado sobre el viewport.
function bloquearScrollFondo() {
    scrollYGuardado = window.scrollY;

    // Ancho de la scrollbar vertical del navegador (0 si no había, p.ej.
    // en móvil con scrollbar superpuesta o si el contenido no desborda).
    const anchoScrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.body.classList.add("scroll-lock");
    document.body.style.top = `-${scrollYGuardado}px`;

    if (anchoScrollbar > 0) {
        document.body.style.paddingRight = `${anchoScrollbar}px`;

        // El header es position:fixed;width:100% (ver _header.scss), por lo
        // que no hereda el padding del body: hay que compensarlo aparte
        // para que no se desalinee lateralmente al desaparecer la scrollbar.
        const header = document.querySelector(".header");
        if (header) header.style.paddingRight = `${anchoScrollbar}px`;
    }
}

function desbloquearScrollFondo() {
    document.body.classList.remove("scroll-lock");
    document.body.style.top = "";
    document.body.style.paddingRight = "";

    const header = document.querySelector(".header");
    if (header) header.style.paddingRight = "";

    // Restaura exactamente la posición donde estaba el usuario antes de
    // abrir el modal. Sin "behavior: smooth": debe ser instantáneo, no
    // debe verse como un nuevo scroll animado.
    window.scrollTo(0, scrollYGuardado);
}

/* CARRUSEL DEL MODAL (DOM real con scroll-snap, no reemplazo de src) */
/* Las imágenes viven dentro de .modal__track (único elemento que hace  */
/* scroll). Los controles (.modal__controls: flechas + dots) son        */
/* hermanos del track/imagen: en desktop el CSS los superpone sobre la  */
/* imagen (como siempre); en mobile/tablet pequeña el CSS los coloca en */
/* una barra propia debajo (Feature 02.2). El DOM y la lógica JS son    */
/* los mismos para ambos casos — solo cambia el CSS por breakpoint.     */
function renderCarruselModal(nombreProducto) {
    if (!modalTrack) return;

    modalTrack.innerHTML = "";

    listaImagenes.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `${nombreProducto} - imagen ${i + 1}`;
        modalTrack.appendChild(img);
    });

    modalTrack.scrollLeft = 0;

    renderDots();
    actualizarVisibilidadControles();
    actualizarDotsActivos();
}

/* Oculta TODA la barra de controles (flechas + dots) cuando el producto  */
/* tiene una sola imagen, en vez de ocultar cada flecha por separado.     */
/* Así se evita el espacio vacío reservado tanto en desktop como en       */
/* mobile (requisito: "no dejar espacio vacío reservado para controles"). */
function actualizarVisibilidadControles() {
    const hayVariasImagenes = listaImagenes.length > 1;

    if (modalControls) modalControls.style.display = hayVariasImagenes ? "flex" : "none";
}

/* Genera un dot (button) por cada imagen del producto actual.           */
/* Nunca hardcodea una cantidad: usa listaImagenes.length dinámicamente. */
function renderDots() {
    if (!modalDots) return;

    modalDots.innerHTML = "";

    if (listaImagenes.length <= 1) return;

    listaImagenes.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("aria-label", `Ver imagen ${i + 1} de ${listaImagenes.length}`);

        dot.addEventListener("click", (e) => {
            e.stopPropagation();
            imagenActual = i;
            desplazarCarruselA(imagenActual);
            actualizarDotsActivos();
        });

        modalDots.appendChild(dot);
    });
}

/* Refleja imagenActual (el único índice real del carrusel) en el dot   */
/* correspondiente. Se llama tras usar una flecha, hacer swipe manual,  */
/* tocar un dot, o abrir el modal — nunca hay un índice aparte para los */
/* dots que pueda desincronizarse del track.                            */
function actualizarDotsActivos() {
    if (!modalDots) return;

    const dots = modalDots.querySelectorAll("button");
    dots.forEach((dot, i) => {
        dot.setAttribute("aria-current", i === imagenActual ? "true" : "false");
    });
}

function prefiereMovimientoReducido() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function desplazarCarruselA(indice) {
    if (!modalTrack) return;

    const ancho = modalTrack.clientWidth;
    modalTrack.scrollTo({
        left: ancho * indice,
        behavior: prefiereMovimientoReducido() ? "auto" : "smooth"
    });
}

/* BOTÓN AGREGAR DESDE MODAL */
// event binding en DOMContentLoaded (arriba); cierre vía cerrarModal()

/* CERRAR MODAL */
// event binding en DOMContentLoaded (arriba); toda la lógica de cierre
// vive en cerrarModal() (ver sección MODAL más arriba)


/* RENDER PRODUCTOS */
function renderProductos() {
    const contenedor = document.getElementById("productos");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const filtrados = productos.filter(p =>
        categoriaActual === "all" || p.categoria === categoriaActual
    );

    filtrados.forEach(producto => {
        const card = crearCard(producto);
        contenedor.appendChild(card);
    });
}

/* FILTROS */
function activarFiltros() {
    const botones = document.querySelectorAll(".products__filters button");

    botones.forEach(btn => {
        btn.addEventListener("click", () => {

            botones.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            categoriaActual = btn.dataset.categoria || "all";

            renderProductos();
        });
    });
}

/* CARRITO PANEL */
const btnCart = document.querySelector(".btn-cart");
const panel = document.getElementById("cart-panel");
const closeCart = document.getElementById("close-cart");

if (btnCart && panel && closeCart) {

    btnCart.addEventListener("click", () => {
        panel.classList.add("active");
        renderCarrito();
    });

    closeCart.addEventListener("click", () => {
        panel.classList.remove("active");
    });
}
