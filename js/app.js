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

// SECCIÓN EXPANDIBLE "MÁS INFORMACIÓN" (Feature 02.7 — ajuste de jerarquía)
// Agrupa TODA la ficha técnica (Material, Medidas, Cuidados, detalles
// adicionales, descripción completa) — nada de esto se muestra en la
// vista inicial, solo nombre/precio/descripción corta. Arranca colapsada
// en cada apertura del modal (ver abrirModal → renderMasInformacion →
// colapsarMasInformacion).
let modalMoreWrap; // #modal-more-wrap: contenedor completo (botón + panel), oculto si no hay nada que expandir
let modalMoreToggle; // #modal-more-toggle: <button> real, controla aria-expanded
let modalMorePanel; // #modal-more-panel: panel colapsable (atributo "hidden")

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
    modalMoreWrap = document.getElementById("modal-more-wrap");
    modalMoreToggle = document.getElementById("modal-more-toggle");
    modalMorePanel = document.getElementById("modal-more-panel");

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

    // 🔥 Feature 02.7 (ajuste UX): toggle de "Más información". Al ser un
    // <button> real, el navegador ya dispara "click" con mouse, touch y
    // teclado (Enter/Espacio) sin código adicional — no hace falta un
    // listener de teclado aparte. Un único handler alterna el estado;
    // colapsarMasInformacion()/expandirMasInformacion() son las únicas
    // funciones que tocan aria-expanded/hidden, para que nunca queden
    // desincronizados entre sí.
    if (modalMoreToggle) {
        modalMoreToggle.addEventListener("click", () => {
            const expandido = modalMoreToggle.getAttribute("aria-expanded") === "true";
            if (expandido) {
                colapsarMasInformacion();
            } else {
                expandirMasInformacion();
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
    modalPrice.textContent = formatearPrecioMXN(producto.precio); // ver formatearPrecioMXN: solo presentación

    // 🔥 Feature 02.7: ficha informativa. renderDescripcionesModal muestra
    // la descripción corta (siempre visible). renderMasInformacion arma
    // el panel expandible completo (Material, Medidas, Cuidados, detalles
    // adicionales, descripción completa — TODA la ficha técnica vive ahí
    // ahora, nada se muestra en la vista inicial) y lo deja SIEMPRE
    // colapsado al abrir — nunca arrastra el estado "abierto" de una
    // apertura previa, sea del mismo producto o de otro.
    renderDescripcionesModal(producto);
    renderMasInformacion(producto);

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

/* 🔥 Feature 02.7 (ajuste de jerarquía) — FORMATO DE PRECIO ("$999 MXN").
   Cambio ÚNICAMENTE de presentación: producto.precio (el valor numérico
   real) nunca se modifica ni se recalcula aquí — esta función solo
   decide cómo se escribe en pantalla. No participa en ningún cálculo de
   carrito/subtotal/total (esos siguen leyendo producto.precio tal cual,
   en js/carrito.js).
   Formato: separador de miles, sin decimales si el precio es un entero
   (ej. $999 MXN, $1,299 MXN), con 2 decimales si no lo es (ej.
   $999.50 MXN) — preparado para si en el futuro el precio trae centavos. */
function formatearPrecioMXN(precio) {
    const numero = Number(precio);

    // Resguardo: si por algún motivo el valor no es un número válido,
    // se muestra tal cual llegó en vez de romper el modal.
    if (!Number.isFinite(numero)) return `$${precio} MXN`;

    const formateado = numero.toLocaleString("es-MX", {
        minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
        maximumFractionDigits: 2
    });

    return `$${formateado} MXN`;
}

/* 🔥 Feature 02.7 — DESCRIPCIÓN CORTA.
   "corta" = producto.descripcionCorta, o si no existe, producto.descripcion
   (así un producto que solo tenga "descripcion" no se queda sin texto
   visible). La descripción COMPLETA ya no vive aquí: desde el ajuste UX
   se muestra dentro del panel "Más información" (ver renderMasInformacion),
   solo cuando aporta algo distinto a esta corta.
   Si el producto no tiene ningún campo de descripción, el bloque queda
   oculto (display:none): no se renderiza un párrafo vacío ni un
   placeholder genérico — campo ausente, no se muestra (spec §2). */
function renderDescripcionesModal(producto) {
    if (!modalDesc) return;

    const corta = producto.descripcionCorta || producto.descripcion || null;

    if (corta) {
        modalDesc.textContent = corta; // seguro: textContent, nunca innerHTML
        modalDesc.style.display = "";
    } else {
        modalDesc.textContent = "";
        modalDesc.style.display = "none";
    }
}

/* 🔥 Feature 02.7 (ajuste de jerarquía) — SECCIÓN EXPANDIBLE
   "MÁS INFORMACIÓN". Desde este ajuste contiene TODA la ficha técnica
   (nada de esto se muestra en la vista inicial del modal, que se limita
   a nombre/precio/descripción corta): Material, Medidas, Cuidados, cada
   entrada de producto.detalles (especificaciones variables — distintas
   categorías de producto necesitarán propiedades distintas, por eso NO
   hay campos fijos para cada característica posible, spec Feature 02.7
   §7) y, al final, la descripción completa (bajo la etiqueta
   "Descripción"), SOLO si existe y es distinta de la corta ya visible
   arriba — nunca se duplica la misma información dos veces. El orden es
   siempre el mismo, salteando lo que no exista: Material, Medidas,
   Cuidados, detalles adicionales, descripción completa.

   Si no hay NINGÚN contenido para el panel (ni material, ni medidas, ni
   cuidados, ni detalles, ni descripción completa distinta), todo el
   bloque (botón + panel) queda oculto (display:none): nunca se muestra
   "Más información" vacío. Cuando sí hay contenido, el panel se
   reconstruye y queda SIEMPRE colapsado (colapsarMasInformacion) — el
   estado abierto/cerrado nunca sobrevive entre una apertura del modal y
   la siguiente.

   Seguridad de renderizado (spec §8/§10, sin cambios): todo el contenido
   viene de createElement + textContent, nunca de innerHTML con datos del
   producto. */
function renderMasInformacion(producto) {
    if (!modalMoreWrap || !modalMorePanel || !modalMoreToggle) return;

    modalMorePanel.innerHTML = ""; // limpieza del contenedor: no inserta datos del producto

    const items = [];

    if (producto.material) items.push({ etiqueta: "Material", valor: producto.material });
    if (producto.medidas) items.push({ etiqueta: "Medidas", valor: producto.medidas });
    if (producto.cuidados) items.push({ etiqueta: "Cuidados", valor: producto.cuidados });

    if (Array.isArray(producto.detalles)) {
        producto.detalles.forEach((detalle) => {
            if (!detalle) return;

            const etiqueta = detalle.etiqueta;
            const valor = detalle.valor;

            // Descarta entradas incompletas: nunca una etiqueta huérfana
            // (sin valor) ni un valor sin etiqueta.
            const valorValido = valor !== undefined && valor !== null && String(valor).trim() !== "";
            const etiquetaValida = typeof etiqueta === "string" && etiqueta.trim() !== "";

            if (etiquetaValida && valorValido) {
                items.push({ etiqueta, valor: String(valor) });
            }
        });
    }

    const corta = producto.descripcionCorta || producto.descripcion || null;
    const completa = producto.descripcion || null;
    const mostrarCompleta = Boolean(completa) && completa !== corta;
    if (mostrarCompleta) {
        items.push({ etiqueta: "Descripción", valor: completa });
    }

    if (items.length === 0) {
        modalMoreWrap.style.display = "none";
        return;
    }

    modalMoreWrap.style.display = "";
    items.forEach((item) => {
        modalMorePanel.appendChild(crearFilaSpec(item.etiqueta, item.valor));
    });

    // Cada vez que se (re)construye el panel (es decir, cada vez que se
    // abre un producto) arranca colapsado, sin importar cómo haya
    // quedado la vez anterior (spec: "debe iniciar cerrada cada vez que
    // se abra un producto").
    colapsarMasInformacion();
}

/* Únicas dos funciones que tocan el estado abierto/cerrado del panel:
   mantienen aria-expanded (accesibilidad) y el atributo hidden (oculta
   de verdad el panel, tanto visual como para lectores de pantalla)
   siempre sincronizados entre sí — nunca se modifican por separado en
   otro lugar del código. */
function colapsarMasInformacion() {
    if (!modalMoreToggle || !modalMorePanel) return;
    modalMoreToggle.setAttribute("aria-expanded", "false");
    modalMorePanel.hidden = true;
    modalMoreToggle.classList.remove("is-open");
}

function expandirMasInformacion() {
    if (!modalMoreToggle || !modalMorePanel) return;
    modalMoreToggle.setAttribute("aria-expanded", "true");
    modalMorePanel.hidden = false;
    modalMoreToggle.classList.add("is-open");
}

/* Crea una fila etiqueta/valor de la ficha (formato "ficha", no tabla):
   la etiqueta con más peso visual arriba, el valor con peso normal
   debajo. Ambos se asignan vía textContent — nunca vía innerHTML —
   porque etiqueta/valor pueden venir de datos de producto (spec §8). */
function crearFilaSpec(etiqueta, valor) {
    const fila = document.createElement("div");
    fila.className = "modal__spec";

    const labelEl = document.createElement("span");
    labelEl.className = "modal__spec-label";
    labelEl.textContent = etiqueta;

    const valueEl = document.createElement("span");
    valueEl.className = "modal__spec-value";
    valueEl.textContent = valor;

    fila.appendChild(labelEl);
    fila.appendChild(valueEl);

    return fila;
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
