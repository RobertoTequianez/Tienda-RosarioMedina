// PRODUCTO SELECCIONADO
let productoSeleccionado = null;

// CARRUSEL
let imagenActual = 0;
let listaImagenes = [];

// MODAL
let modal;
let modalContent; // .modal__content: cuadro de diálogo real (role="dialog"), límite del focus trap
let modalTrack; // .modal__track: único elemento que hace scroll (carrusel DOM real)
let modalTitle;
let modalPrice;
let modalDesc;
let closeModal;

// ACCESIBILIDAD DEL MODAL (Feature 03)
// elementoOrigenModal: elemento que tenía el foco antes de abrir el modal
// (card/botón que lo disparó), para devolver el foco ahí al cerrar (§6).
// elementosInertados: elementos del fondo a los que se les aplicó "inert"
// (o su alternativa) mientras el modal está abierto, para poder revertirlo
// exactamente al cerrar (§7).
let elementoOrigenModal = null;
let elementosInertados = [];

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
    modalContent = modal ? modal.querySelector(".modal__content") : null;
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

    // 🔥 Feature 03 (accesibilidad): Escape y focus trap (Tab/Shift+Tab).
    // Un único listener, siempre activo, que revisa si el modal está
    // realmente abierto antes de actuar — así no hace falta agregar y
    // quitar el listener en cada apertura/cierre. Escape reutiliza
    // cerrarModal() (el mismo punto único de cierre que el botón X y el
    // clic fuera): "NO duplicar lógica de cierre".
    if (modal) {
        modal.addEventListener("keydown", manejarTeclasModal);
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

    // 🔥 Feature 07A: renderProductosDestacadosHome() se auto-detecta por
    // elemento (busca "#productos-home-grid") — en productos.html ese
    // elemento no existe, así que en esa página esta llamada no hace nada
    // (la construcción del catálogo completo la maneja js/catalogo.js,
    // cargado aparte, sin duplicar esta función).
    renderProductosDestacadosHome();

    actualizarContador();
    renderCarrito();

    activarNavegacion();
});

/* 🔥 Última ronda de ajustes (punto 1) — NAVEGACIÓN INTENCIONAL CENTRALIZADA
   ==================================================================
   Antes, el desplazamiento hacia #inicio/#productos dependía de una regla
   CSS GLOBAL (html{scroll-behavior:smooth}, ver scss/_base.scss). Esa
   regla quedó eliminada: se comprobó con Playwright (no se asumió) que
   afectaba TODO scroll de la página, no solo la navegación — incluía
   window.scrollTo() de restauración de fondo (modal/carrito) y cualquier
   focus() de devolución de foco cuyo elemento no quedara 100% visible,
   produciendo el desplazamiento vertical involuntario reportado (ver
   auditoría completa en el reporte de esta ronda).

   navegarASeccion() es ahora el ÚNICO punto que dispara un scroll suave
   intencional, y solo lo usan los disparadores reales de navegación:
   Inicio/Productos/Ofertas(→Productos)/Nosotros, el logo y "Comprar
   ahora". Respeta prefers-reduced-motion (reutiliza
   prefiereMovimientoReducido(), ya usada por el carrusel del modal — no
   se duplica la detección) y respeta el scroll-margin-top ya definido
   por sección (scss/_base.scss) porque scrollIntoView() lo honra de forma
   nativa, sin recalcular manualmente la altura del header. */
function navegarASeccion(idDestino) {
    const destino = document.getElementById(idDestino);
    if (!destino) return;

    destino.scrollIntoView({
        behavior: prefiereMovimientoReducido() ? "auto" : "smooth",
        block: "start",
    });

    // Mantiene la URL sincronizada con la sección visitada sin usar el
    // salto instantáneo nativo del navegador (que competiría con el
    // scrollIntoView de arriba) — pushState no mueve el scroll por sí
    // mismo.
    if (window.history && typeof window.history.pushState === "function") {
        window.history.pushState(null, "", "#" + idDestino);
    } else {
        window.location.hash = idDestino;
    }
}

/* 🔥 Última ronda de ajustes (punto 2/5) — ESTADO ACTIVO DE NAVEGACIÓN
   ==================================================================
   Único punto que decide qué link luce "activo" (clase .is-active +
   aria-current="location"). Se aplica SOLO a los links de secciones
   reales DENTRO DE ESTA PÁGINA (Inicio/Nosotros, ver SECCIONES_NAVEGABLES).

   🔥 Feature 07A: "productos" se retira de esta lista. "Productos" en el
   header dejó de ser un ancla interna (ya no existe un catálogo completo
   dentro de la Home, navega a productos.html como enlace real, ver
   auditoría/index.html) — nunca vuelve a recibir estado activo/aria-current
   por scroll-spy en esta página. En productos.html, "Productos" recibe su
   propio estado "página actual" de forma estática (ver js/catalogo.js:
   marcarNavProductosComoPaginaActual), sin depender de este mecanismo de
   scroll-spy (no hay secciones que scrollear ahí). "Ofertas" tampoco
   participa: nunca representó una sección propia (punto 5, sin cambios). */
const SECCIONES_NAVEGABLES = ["inicio", "nosotros"];
const IDS_LINK_POR_SECCION = {
    inicio: "nav-inicio",
    nosotros: "nav-nosotros",
};

function establecerSeccionActiva(idSeccion) {
    if (!SECCIONES_NAVEGABLES.includes(idSeccion)) return;

    SECCIONES_NAVEGABLES.forEach((seccion) => {
        const link = document.getElementById(IDS_LINK_POR_SECCION[seccion]);
        if (!link) return;

        if (seccion === idSeccion) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "location");
        } else {
            link.classList.remove("is-active");
            link.removeAttribute("aria-current");
        }
    });
}

/* 🔥 Última ronda de ajustes (punto 6) — SINCRONIZACIÓN CON SCROLL MANUAL
   ==================================================================
   Se evaluó IntersectionObserver y SÍ se implementa: con solo 3 secciones
   rastreables (Inicio/Productos/Nosotros, nunca Ofertas) la lógica es
   simple y robusta, no hace falta nada más elaborado (scroll-spy con
   pesos, throttling manual, etc.).
   rootMargin recorta el área de detección para que la sección deba ocupar
   una franja central razonable del viewport (no basta con asomar 1px bajo
   el header) antes de considerarse "la actual".
   Guard anti-flicker: mientras el usuario acaba de hacer clic en un link
   (navegarASeccion en curso), el observer queda en pausa un instante — el
   scroll programático atraviesa visualmente otras secciones de camino a
   destino y sin este guard el estado activo parpadearía con la sección de
   paso antes de asentarse en la de destino. */
let navegacionProgramaticaEnCurso = false;
let navegacionProgramaticaTimeoutId = null;

function marcarNavegacionProgramatica() {
    navegacionProgramaticaEnCurso = true;
    if (navegacionProgramaticaTimeoutId) clearTimeout(navegacionProgramaticaTimeoutId);
    // Ventana de seguridad: cubre incluso un scroll "smooth" largo entre
    // Inicio y Nosotros (las dos secciones más alejadas entre sí). Si el
    // navegador soporta el evento "scrollend" se libera antes (ver abajo).
    navegacionProgramaticaTimeoutId = setTimeout(() => {
        navegacionProgramaticaEnCurso = false;
    }, 1000);
}

if ("onscrollend" in window) {
    window.addEventListener("scrollend", () => {
        navegacionProgramaticaEnCurso = false;
        if (navegacionProgramaticaTimeoutId) clearTimeout(navegacionProgramaticaTimeoutId);
    });
}

/* ¿El usuario ya llegó (o casi) al final real de la página? Se usa tanto
   para el caso borde de "Nosotros" (última sección, ver
   activarDeteccionFinDePagina) como para que el propio
   IntersectionObserver de abajo SE ABSTENGA de opinar en ese preciso
   momento — sin este resguardo, "Productos" (que todavía puede seguir
   cruzando su franja de detección porque es una sección alta) le ganaba
   la carrera al caso especial de fin de página y el estado activo volvía
   a "Productos" justo cuando el usuario ya estaba viendo "Nosotros". */
function estaCercaDelFinalDePagina() {
    return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
}

function activarObservadorSecciones() {
    if (typeof IntersectionObserver === "undefined") return; // resguardo, navegadores muy antiguos

    const secciones = SECCIONES_NAVEGABLES
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    if (secciones.length === 0) return;

    const observer = new IntersectionObserver(
        (entradas) => {
            if (navegacionProgramaticaEnCurso) return;
            if (estaCercaDelFinalDePagina()) return; // ver activarDeteccionFinDePagina

            // De las secciones actualmente intersectando la franja central,
            // la de mayor proporción visible es la "actual". Si ninguna
            // intersecta (p. ej. el usuario está sobre el hero antes de
            // #inicio o en el footer tras #nosotros) no se cambia nada —
            // se conserva el último estado activo real conocido.
            const visibles = entradas.filter((e) => e.isIntersecting);
            if (visibles.length === 0) return;

            visibles.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
            const idSeccion = visibles[0].target.id;
            establecerSeccionActiva(idSeccion);
        },
        {
            // Franja de detección angosta, pegada justo debajo del header
            // fixed (~110px cubre el header más alto, 81px, con margen):
            // la sección que esté cruzando esa franja es "la actual". Con
            // un margen inferior de -75% en vez de partir el viewport por
            // la mitad, esta franja queda cerca del techo visible — así
            // funciona igual de bien con secciones altas (Productos, con
            // grilla larga) que con secciones cortas (Nosotros, texto
            // breve): ambas alcanzan esa franja apenas quedan "debajo del
            // header", sin depender de cuánto ocupen del viewport total.
            rootMargin: "-110px 0px -75% 0px",
            threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
        }
    );

    secciones.forEach((seccion) => observer.observe(seccion));

    activarDeteccionFinDePagina();
}

/* 🔥 Última ronda de ajustes (punto 6) — CASO BORDE: "Nosotros" es la
   ÚLTIMA sección antes del footer (breve, sin nada debajo). En viewports
   donde el documento no tiene suficiente alto para desplazarse hasta que
   esa sección quede pegada bajo el header (el navegador no puede
   scrollear más allá del final real de la página), la franja de
   detección "pegada al header" del IntersectionObserver de arriba nunca
   llega a activarse para Nosotros por scroll manual — comprobado con
   Playwright, no asumido. Solución simple y robusta (en vez de complicar
   el rootMargin persiguiendo un caso que depende del alto exacto del
   documento/viewport): un listener de scroll liviano y pasivo que
   verifica si ya se llegó al final real de la página; si es así, se
   fuerza el estado activo a "nosotros" directamente, sin depender de
   intersección. No compite con el observer de arriba (nunca se ejecutan
   para el mismo punto de scroll: este caso solo aplica exactamente al
   final de la página, donde el observer ya no tiene más sección debajo
   que activar). */
function activarDeteccionFinDePagina() {
    if (!document.getElementById("nosotros")) return;

    let programado = false;
    window.addEventListener(
        "scroll",
        () => {
            if (navegacionProgramaticaEnCurso || programado) return;
            programado = true;
            window.requestAnimationFrame(() => {
                programado = false;
                if (estaCercaDelFinalDePagina()) establecerSeccionActiva("nosotros");
            });
        },
        { passive: true }
    );
}

/* 🔥 Feature 06 (base) + última ronda de ajustes + Feature 07A —
   NAVEGACIÓN DEL HEADER
   ==================================================================
   El header (index.html y productos.html) comparte el MISMO marcado —
   mismos ids, mismo <nav> (spec Feature 07A §11) — pero cada página le da
   a "Inicio"/"Nosotros"/logo un href distinto según dónde vive realmente
   el destino:
     - En index.html: anclas reales de ESTA página (href="#inicio"/
       "#nosotros") → se interceptan con navegarASeccion() (scroll suave
       intencional existente, SIN CAMBIOS).
     - En productos.html: enlaces reales hacia OTRA página
       (href="index.html"/"index.html#nosotros") → NO se interceptan, el
       navegador los resuelve nativamente (no hay nada que scrollear en
       ESTA página): "no usar JavaScript innecesario si un <a> real
       resuelve la navegación" (spec §7, aplicado aquí también).
   Se decide en runtime leyendo el propio atributo href de cada link (si
   empieza con "#" es un ancla de esta página) — así una única función
   sirve para ambas páginas sin duplicar lógica ni necesitar detectar en
   qué página está.

   "Productos"/"Ofertas"/"Comprar ahora" YA NO participan de este mecanismo
   en ninguna página: ahora son enlaces reales hacia productos.html (con o
   sin ?aviso=ofertas), resueltos enteramente por el navegador — ver
   index.html/productos.html. El aviso de "Ofertas" ("Por el momento no
   hay ofertas disponibles.") se dispara del lado de productos.html al
   leer ese query param (ver js/catalogo.js), nunca aquí. */
function activarNavegacion() {
    const enlaceInicio = document.getElementById("nav-inicio");
    const enlaceNosotros = document.getElementById("nav-nosotros");
    const logo = document.querySelector(".header__logo");

    function interceptarSiEsAnclaLocal(enlace, idSeccion) {
        if (!enlace) return;

        const href = enlace.getAttribute("href") || "";
        if (!href.startsWith("#")) return; // enlace real hacia otra página: sin JS

        enlace.addEventListener("click", (e) => {
            e.preventDefault();
            marcarNavegacionProgramatica();
            navegarASeccion(idSeccion);
            establecerSeccionActiva(idSeccion);
        });
    }

    interceptarSiEsAnclaLocal(enlaceInicio, "inicio");
    interceptarSiEsAnclaLocal(enlaceNosotros, "nosotros");

    if (logo) {
        const hrefLogo = logo.getAttribute("href") || "";
        if (hrefLogo.startsWith("#")) {
            logo.addEventListener("click", (e) => {
                e.preventDefault();
                marcarNavegacionProgramatica();
                navegarASeccion("inicio");
                establecerSeccionActiva("inicio");
            });
        }
        // Si no empieza con "#" (productos.html: href="index.html"), es un
        // enlace real hacia el Home — el navegador lo resuelve solo.
    }

    activarObservadorSecciones();
    activarMenuMobile();
}

/* 🔥 Feature 06 (ajuste posterior) — MENÚ MOBILE (<600px, ver
   scss/_header.scss). El mismo <nav>/<ul> del header (id="header-nav")
   se muestra como panel desplegable vertical; en tablet/desktop
   (>=600px) el CSS lo mantiene siempre visible en línea y este menú
   nunca llega a "abrirse" (el botón hamburguesa está oculto ahí, ver
   activarMenuMobile más abajo — no hay necesidad de comprobar el ancho
   en JS).
   NO es un focus trap completo (no es un modal, punto 13): los links
   son tabulables normalmente, Escape cierra y devuelve el foco al botón
   hamburguesa, aria-expanded se mantiene sincronizado con el estado
   visual real en todo momento. */
let menuMobileAbierto = false;
let menuToggleBtn;
let headerNavEl;

function activarMenuMobile() {
    menuToggleBtn = document.getElementById("menu-toggle");
    headerNavEl = document.getElementById("header-nav");
    if (!menuToggleBtn || !headerNavEl) return;

    menuToggleBtn.addEventListener("click", () => {
        if (menuMobileAbierto) {
            cerrarMenuMobile();
        } else {
            abrirMenuMobile();
        }
    });

    // Cerrar el menú al seleccionar cualquier link de navegación
    // (Inicio/Productos/Ofertas) — el anchor de todas formas navega
    // normalmente, esto solo limpia el estado visual del menú.
    headerNavEl.querySelectorAll(".nav__link").forEach((link) => {
        link.addEventListener("click", () => {
            if (menuMobileAbierto) cerrarMenuMobile();
        });
    });

    // Escape cierra y devuelve el foco al botón hamburguesa (punto 13).
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menuMobileAbierto) {
            cerrarMenuMobile({ devolverFoco: true });
        }
    });

    // Click fuera del menú/botón lo cierra (punto 12) — implementación
    // simple, sin interferir con carrito/modal: solo escucha mientras el
    // menú está realmente abierto (se agrega/quita el listener en
    // abrir/cerrarMenuMobile, no queda escuchando todo el tiempo).
}

function manejarClickFueraDelMenu(e) {
    if (!headerNavEl || !menuToggleBtn) return;
    if (headerNavEl.contains(e.target) || menuToggleBtn.contains(e.target)) return;
    cerrarMenuMobile();
}

function abrirMenuMobile() {
    if (!menuToggleBtn || !headerNavEl || menuMobileAbierto) return;

    // 🔥 Punto 14: si el carrito está abierto, cerrarlo primero — nunca
    // deben quedar el menú y el drawer del carrito abiertos a la vez.
    if (typeof cerrarCarrito === "function") {
        const panel = document.getElementById("cart-panel");
        if (panel && panel.classList.contains("active")) {
            cerrarCarrito();
        }
    }

    menuMobileAbierto = true;
    headerNavEl.classList.add("header__nav--open");
    menuToggleBtn.setAttribute("aria-expanded", "true");
    menuToggleBtn.setAttribute("aria-label", "Cerrar menú");

    // El listener de click-outside se agrega en el siguiente tick para
    // no capturar el mismo click que acaba de abrir el menú.
    setTimeout(() => document.addEventListener("click", manejarClickFueraDelMenu), 0);
}

function cerrarMenuMobile(opciones = {}) {
    if (!menuToggleBtn || !headerNavEl || !menuMobileAbierto) return;

    menuMobileAbierto = false;
    headerNavEl.classList.remove("header__nav--open");
    menuToggleBtn.setAttribute("aria-expanded", "false");
    menuToggleBtn.setAttribute("aria-label", "Abrir menú");

    document.removeEventListener("click", manejarClickFueraDelMenu);

    // 🔥 Última ronda de ajustes (punto 1): preventScroll:true — el
    // hamburguesa siempre vive en el header fixed (100% visible), pero se
    // deja explícito por consistencia con el resto de los focus() de
    // devolución de foco de esta ronda.
    if (opciones.devolverFoco) {
        menuToggleBtn.focus({ preventScroll: true });
    }
}

/* CREAR CARD */
function crearCard(producto, esPrimeraFila) {
    const card = document.createElement("div");
    card.classList.add("product-card");

    // 🔥 Feature 02.6: producto agotado → botón AGOTADO, con el atributo
    // "disabled" real (no solo apariencia por CSS), para que el navegador
    // ni siquiera dispare el evento click.
    const agotado = estaAgotado(producto);

    // 🔥 Feature 04 (rendimiento): la primera fila carga eager (nunca debe
    // retrasarse con lazy loading, puede estar visible de entrada); el
    // resto usa loading="lazy" para no descargar imágenes fuera del
    // viewport inicial. decoding="async" en todos los casos: ninguna
    // imagen de card es la LCP real (esa es el fondo del hero, ver
    // index.html/_hero.scss), así que decodificarla no debe bloquear el
    // hilo principal. width/height son un tamaño de referencia — el CSS
    // (height:280px, width:100%, object-fit:cover) sigue mandando siempre
    // sobre el tamaño visual real; solo ayudan al navegador a reservar
    // espacio antes de que cargue la imagen (evita CLS).
    const loadingAttr = esPrimeraFila ? "" : ` loading="lazy"`;

    // 🔥 Ronda final de pulido (spec §2/§3): antes esta card mostraba
    // "$" + producto.precio crudo, sin "MXN" — era la única presentación
    // de precio del sitio que no pasaba por formatearPrecioMXN() (modal y
    // carrito ya lo usaban). Se corrige para que TODA presentación de
    // precio visible use el mismo formateador único — nunca un segundo
    // formatter paralelo (formatearPrecioMXN sigue viviendo solo aquí, en
    // js/app.js — ver esa función más abajo).
    card.innerHTML = `
        <div class="product-card__image">
            <img src="${producto.imagen}" alt="${producto.nombre}" width="300" height="280" decoding="async"${loadingAttr}>
        </div>

        <div class="product-card__info">
            <h3 class="product-card__title"><button type="button" class="product-card__title-btn">${producto.nombre}</button></h3>
            <p class="product-card__price">${formatearPrecioMXN(producto.precio)}</p>

            <button type="button" class="product-card__btn"${agotado ? " disabled" : ""}>${agotado ? "AGOTADO" : "AGREGAR"}</button>
        </div>
    `;

    const btn = card.querySelector(".product-card__btn");
    const tituloBtn = card.querySelector(".product-card__title-btn");

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        agregarAlCarrito(producto, btn);
    });

    // 🔥 Feature 03 (accesibilidad, Section 14): botón real (nativo, no un
    // div con role="button") anidado en el <h3> del título, para que un
    // usuario que navega solo con teclado (TAB + Enter/Espacio) pueda
    // abrir el detalle del producto — antes la card completa (un <div>)
    // no era focoseable ni operable por teclado. Válido en HTML5: un
    // encabezado admite "phrasing content" y este botón solo contiene
    // texto; queda SIEMPRE hermano del botón AGREGAR, nunca anidado
    // dentro de él (no se permiten botones anidados). e.stopPropagation()
    // evita que el listener de la card (abajo) dispare una segunda
    // apertura del mismo modal para el mismo clic.
    if (tituloBtn) {
        tituloBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModal(producto, tituloBtn);
        });
    }

    // El producto agotado sigue siendo visible y se puede abrir su modal
    // (para informar al usuario) — solo el botón AGREGAR queda bloqueado.
    // Cubre el resto del área de la card (imagen, precio, espacio en
    // blanco) para mouse/touch, exactamente como antes.
    card.addEventListener("click", () => {
        abrirModal(producto, card);
    });

    return card;
}

/* MODAL */
// Punto único de apertura. Cualquier código nuevo que deba ejecutarse al
// abrir el modal (incluido el bloqueo de scroll del fondo) se agrega aquí,
// nunca en un caller individual.
// "origen" (Feature 03, accesibilidad §3/§6): el elemento que disparó esta
// apertura (card/botón de título), para poder devolverle el foco al
// cerrar. Si no se pasa explícitamente, se usa el elemento con foco actual
// como resguardo.
function abrirModal(producto, origen) {
    // 🔥 Ajuste posterior (Feature 06, punto 15): el menú mobile no debe
    // quedar flotando por encima del modal de producto — se cierra antes
    // de abrir el modal, sin tocar el focus trap del modal en sí.
    if (typeof cerrarMenuMobile === "function") cerrarMenuMobile();

    elementoOrigenModal = origen || document.activeElement || null;

    bloquearScrollFondo();
    aplicarInertFondo();

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

    // 🔥 Feature 03 (accesibilidad §3): foco inicial en CERRAR, no en
    // AGREGAR — evita que un usuario de teclado dispare una compra por
    // accidente solo por seguir presionando Enter tras abrir el modal.
    // 🔥 Última ronda de ajustes (punto 1 — bug de scroll involuntario):
    // { preventScroll: true } — el único objetivo de este focus() es
    // accesibilidad (que el lector de pantalla/teclado arranque en el
    // botón Cerrar), nunca mover la página. Sin esto, si el botón no
    // quedara 100% visible el navegador podría desplazar la vista por su
    // cuenta (scrollIntoView nativo del propio focus()) — el modal ya
    // centra su contenido visualmente, así que ese desplazamiento nunca
    // era intencional.
    if (closeModal) {
        closeModal.focus({ preventScroll: true });
    }
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

    // 🔥 Feature 03 (revisión de accesibilidad): aria-describedby del
    // diálogo solo debe apuntar a #modal-description cuando realmente hay
    // una descripción corta que mostrar. Si el producto no tiene
    // descripcionCorta ni descripcion, el atributo se quita por completo
    // en vez de dejarlo apuntando a un nodo vacío/oculto. No se inventa
    // ningún texto de descripción.
    if (modalContent) {
        if (corta) {
            modalContent.setAttribute("aria-describedby", "modal-description");
        } else {
            modalContent.removeAttribute("aria-describedby");
        }
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
// clic fuera/overlay, botón AGREGAR del modal, y la tecla Escape de
// Feature 03) deben llamar exclusivamente a esta función, para que el
// desbloqueo del scroll del fondo nunca pueda quedar desincronizado de
// alguno de esos caminos. Nunca debe quedar el body bloqueado tras cerrar
// el modal por cualquier vía.
function cerrarModal() {
    modal.classList.remove("active");
    desbloquearScrollFondo();
    quitarInertFondo();

    // 🔥 Feature 03 (accesibilidad §6): devuelve el foco al elemento que
    // originó la apertura de ESTE producto (card/botón de título). Si ya
    // no existe en el DOM (p. ej. se re-renderizó la grilla por un filtro
    // mientras el modal estaba abierto), simplemente no se mueve el foco
    // — resguardo seguro que nunca genera errores ni intenta adivinar un
    // destino arbitrario.
    // 🔥 Última ronda de ajustes (punto 1 — bug de scroll involuntario,
    // CONFIRMADO por auditoría con Playwright): este focus() es el
    // causante directo del "salto" visible al cerrar el modal. Con
    // scroll-behavior:smooth global (ya eliminado, ver scss/_base.scss) el
    // navegador animaba el scrollIntoView nativo que dispara focus() en un
    // elemento no garantizado 100% visible, incluso DESPUÉS de que
    // desbloquearScrollFondo() ya había restaurado la posición correcta
    // (se medió que este focus() podía sobreescribir esa restauración con
    // un segundo scroll animado). { preventScroll: true } mantiene
    // devolución de foco/accesibilidad intactas, solo suprime el
    // desplazamiento visual no deseado.
    if (elementoOrigenModal && document.body.contains(elementoOrigenModal) && typeof elementoOrigenModal.focus === "function") {
        elementoOrigenModal.focus({ preventScroll: true });
    }
    elementoOrigenModal = null;
}

/* 🔥 Feature 03 (accesibilidad §5): Escape debe cerrar el modal
   reutilizando cerrarModal() — nunca duplicar la lógica de cierre.
   También implementa el focus trap (§4): mientras el modal está abierto,
   Tab/Shift+Tab nunca deben poder salir de él hacia el header, las cards
   de atrás, los filtros, el carrito o WhatsApp. Los elementos focoseables
   se calculan DINÁMICAMENTE en cada pulsación de Tab (no una lista fija),
   porque cambian según el producto (una imagen vs. varias, "Más
   información" visible u oculta, AGOTADO, "-" deshabilitado, etc.). */
function manejarTeclasModal(e) {
    if (!modal.classList.contains("active")) return;

    if (e.key === "Escape") {
        e.preventDefault();
        cerrarModal();
        return;
    }

    if (e.key !== "Tab") return;

    const focosables = obtenerFocosablesModal();
    if (focosables.length === 0) {
        // No debería pasar nunca (siempre hay al menos el botón CERRAR),
        // pero por seguridad no se deja escapar el foco del modal.
        e.preventDefault();
        return;
    }

    const primero = focosables[0];
    const ultimo = focosables[focosables.length - 1];
    const activo = document.activeElement;
    const focoDentroDelModal = modalContent && modalContent.contains(activo);

    if (e.shiftKey) {
        if (!focoDentroDelModal || activo === primero) {
            e.preventDefault();
            ultimo.focus();
        }
    } else {
        if (!focoDentroDelModal || activo === ultimo) {
            e.preventDefault();
            primero.focus();
        }
    }
}

/* Calcula, en el momento en que se pide, los elementos realmente
   focoseables y visibles dentro de .modal__content: nunca una lista fija,
   porque el contenido varía por producto (selector de cantidad oculto si
   está agotado, "Más información" oculta si no hay ficha, distinta
   cantidad de dots según cuántas imágenes tenga, etc.). */
function obtenerFocosablesModal() {
    if (!modalContent) return [];

    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const candidatos = Array.from(modalContent.querySelectorAll(selector));

    return candidatos.filter((el) => {
        if (el.hidden || el.closest("[hidden]")) return false;

        const estilo = window.getComputedStyle(el);
        if (estilo.display === "none" || estilo.visibility === "hidden") return false;

        // offsetParent es null en elementos display:none (propio o de un
        // ancestro) o position:fixed en algunos casos — se acepta también
        // el elemento con foco actual para no descartarlo por eso.
        return el.offsetParent !== null || el === document.activeElement;
    });
}

/* 🔥 Feature 03 (accesibilidad §7): mientras el modal está abierto, el
   contenido del fondo (header, hero, grilla de productos, filtros,
   WhatsApp, panel del carrito, footer) no debe poder alcanzarse por
   teclado ni ser anunciado por lectores de pantalla. Se usa el atributo
   nativo "inert" sobre cada hijo directo de <body> salvo el propio modal
   (nunca se aplica inert al modal). Si el navegador no soporta "inert"
   todavía, se usa aria-hidden="true" como alternativa accesible: no
   bloquea el foco por sí solo, pero el focus trap de arriba ya se
   encarga de que Tab/Shift+Tab nunca lleguen ahí, y aria-hidden evita que
   un lector de pantalla lo anuncie. Se restaura exactamente al cerrar. */
function aplicarInertFondo() {
    // 🔥 Feature 03 (revisión de accesibilidad): #toast es un hijo directo
    // de <body> (ver index.html) y por lo tanto quedaba también marcado
    // inert al abrir el modal — eso apaga la live region para tecnología
    // asistiva justo cuando más se necesita (AGREGADO ✓, stock alcanzado,
    // límite de compra se disparan con frecuencia desde dentro del modal,
    // p. ej. al tocar "+" en el tope). Se excluye explícitamente del
    // bloqueo del fondo: el toast nunca es alcanzable por teclado ni
    // ofrece nada que navegar (no tiene controles), así que dejarlo fuera
    // del inert no reabre ningún hueco en el focus trap.
    elementosInertados = Array.from(document.body.children).filter(
        (el) => el !== modal && el.id !== "toast" && el.tagName !== "SCRIPT"
    );

    elementosInertados.forEach((el) => {
        if ("inert" in el) {
            el.inert = true;
        } else {
            const previo = el.getAttribute("aria-hidden");
            if (previo !== null) el.setAttribute("data-aria-hidden-previo", previo);
            el.setAttribute("aria-hidden", "true");
        }
    });
}

function quitarInertFondo() {
    elementosInertados.forEach((el) => {
        if ("inert" in el) {
            el.inert = false;
        } else {
            const previo = el.getAttribute("data-aria-hidden-previo");
            if (previo !== null) {
                el.setAttribute("aria-hidden", previo);
                el.removeAttribute("data-aria-hidden-previo");
            } else {
                el.removeAttribute("aria-hidden");
            }
        }
    });

    elementosInertados = [];
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
    // abrir el modal. Debe ser SIEMPRE instantáneo, nunca un scroll
    // animado (no es una navegación, es una restauración invisible).
    // 🔥 Última ronda de ajustes (punto 1 — bug de scroll involuntario,
    // CONFIRMADO por auditoría con Playwright): aunque la intención ya
    // era "instantáneo" (ver comentario original), window.scrollTo(x, y)
    // SIN un "behavior" explícito hereda el valor por defecto ("auto"),
    // que a su vez quedaba controlado por la regla global
    // scroll-behavior:smooth de scss/_base.scss — por eso esta
    // restauración se veía animada. Esa regla global ya se eliminó (ver
    // scss/_base.scss), pero además se deja aquí "behavior: auto"
    // explícito como refuerzo: nunca debe depender de qué CSS global
    // exista en el futuro.
    window.scrollTo({ top: scrollYGuardado, left: 0, behavior: "auto" });
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
        // 🔥 Feature 03 (accesibilidad §10): con una sola imagen el alt es
        // solo el nombre del producto (evita un alt innecesariamente largo
        // tipo "imagen 1 de 1"); con varias, incluye la posición y el
        // total ("Mochila TEQUI - imagen 1 de 3"), igual que los dots.
        img.alt = listaImagenes.length > 1
            ? `${nombreProducto} - imagen ${i + 1} de ${listaImagenes.length}`
            : nombreProducto;

        // 🔥 Feature 04 (rendimiento): estas imágenes ya solo se crean al
        // abrir el modal (nunca en la carga inicial de la página — este
        // comportamiento ya existía). Dentro del carrusel, cuando hay
        // varias imágenes, la primera es la que se ve de inmediato
        // (carga eager); el resto vive fuera de la vista dentro del
        // track con scroll horizontal, así que loading="lazy" evita
        // descargarlas si el usuario nunca desliza hasta ellas — el
        // propio navegador las pide en cuanto entran al viewport del
        // scroll, sin necesitar ningún loader propio. decoding="async"
        // en todas: ninguna es la LCP de la página.
        img.decoding = "async";
        if (i > 0) img.loading = "lazy";

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


/* 🔥 Feature 07A — RENDER "PRODUCTOS DESTACADOS" (SOLO HOME)
   ==================================================================
   Reemplaza al antiguo renderProductos()/activarFiltros() (catálogo
   completo con filtro simple por categoría, ahora vivo en
   productos.html/js/catalogo.js, con su propio sistema de filtros/
   búsqueda/orden — no se duplica esa lógica aquí).

   Esta función SOLO existe para la Home: busca el grid limitado
   ("productos-home-grid", ver index.html) y si no lo encuentra (p. ej. en
   productos.html, que no tiene ese elemento) no hace nada — así una
   misma app.js compartida por ambas páginas no necesita detectar en qué
   página está.

   Fuente de qué productos mostrar y cuántos: data/home-config.js
   (HOME_CONFIG), el único punto centralizado (spec §5: nunca IDs
   dispersos por HTML/JS). Nunca inventa productos ni cambia
   stock/disponibilidad/precio — solo selecciona y limita cuáles de los
   productos REALES (data/productos.js) se muestran aquí. Reutiliza
   crearCard() (el MISMO componente de card que usa productos.html): no
   existen dos diseños de card distintos (spec §30). */
function renderProductosDestacadosHome() {
    const contenedor = document.getElementById("productos-home-grid");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const config = (typeof HOME_CONFIG !== "undefined" && HOME_CONFIG) || { maxProductos: 8, destacados: [] };
    const maximo = Number.isFinite(config.maxProductos) ? config.maxProductos : 8;
    const idsDestacados = Array.isArray(config.destacados) ? config.destacados : [];

    // Se preserva el ORDEN declarado en HOME_CONFIG.destacados (no el orden
    // de data/productos.js): permite curar manualmente la selección. Un ID
    // que ya no exista en data/productos.js (producto eliminado/renombrado)
    // se ignora de forma segura, nunca rompe el render.
    const seleccion = idsDestacados
        .map((id) => productos.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, maximo);

    // 🔥 Feature 04 (rendimiento, sin cambios de criterio): primera fila
    // (4 cards, mismo criterio que antes) eager, resto lazy — ver
    // crearCard().
    seleccion.forEach((producto, indice) => {
        const card = crearCard(producto, indice < 4);
        contenedor.appendChild(card);
    });
}

/* CARRITO PANEL */
// 🔥 Feature 05 (UX/responsive/accesibilidad del carrito): la apertura,
// cierre, semántica (dialog en mobile/tablet vs panel lateral en
// desktop), foco, focus trap e inert del carrito ahora viven enteramente
// en js/carrito.js (abrirCarrito/cerrarCarrito) — ese es el archivo dueño
// del carrito. Este bloque solo quedaba acá por historia; se elimina para
// no tener dos puntos de apertura/cierre del mismo panel.
