/* 🔥 Feature 07A — CATÁLOGO COMPLETO (productos.html)
   ==========================================================================
   Este archivo SOLO se carga en productos.html (ver <script> al final de
   ese HTML) y solo hace algo si encuentra sus propios elementos
   ("catalogo-grid", etc.) — en index.html estos elementos no existen, así
   que si por error este script se cargara ahí, no haría nada (mismo
   patrón defensivo que renderProductosDestacadosHome() en js/app.js).

   Reutiliza de js/app.js (cargado antes, mismo scope global):
     - crearCard(producto, esPrimeraFila): MISMO componente de card que la
       Home (spec §30: nunca dos diseños de card distintos).
     - abrirModal()/cerrarModal() y todo lo que depende de ellos: el modal
       de producto ya funciona igual aquí, sin cambios (spec §31) — crearCard
       ya cablea sus propios listeners de apertura de modal.
   Reutiliza de js/carrito.js (cargado antes):
     - mostrarToast(): para el aviso de "Ofertas" y (si hiciera falta) el
       feedback del carrito, sin inventar una segunda implementación.
     - agregarAlCarrito(): ya cableado dentro de crearCard(), el carrito es
       exactamente el mismo objeto/localStorage en ambas páginas (spec §32).

   NO reutiliza ni depende de categoriaActual/activarFiltros() (retirados
   de js/app.js junto con el antiguo catálogo de la Home): el catálogo
   completo tiene su propio estado de filtros (búsqueda + categoría +
   disponibilidad + precio + orden), más rico que el simple filtro de
   categoría que tenía la Home antes de esta Feature. */

/* Estado centralizado de filtros/orden del catálogo. Única fuente de
   verdad — todas las funciones de abajo leen/escriben aquí, nunca guardan
   una copia paralela del estado. */
const catalogoEstado = {
    busqueda: "",
    categoria: "todos",
    enExistencia: false,
    precioMin: null,
    precioMax: null,
    orden: "predeterminado",
};

/* 🔥 §17/§18 — CATEGORÍAS DINÁMICAS, nunca hardcodeadas.
   Deriva la lista de categorías REALES presentes en data/productos.js,
   sin duplicados, ignorando vacíos/nulos, preservando el orden de
   primera aparición (permite orden futuro configurable sin reescribir
   esta función: bastaría con ordenar el arreglo resultante antes de
   devolverlo). "Todos" NUNCA se agrega aquí — es una opción de sistema,
   se agrega aparte en renderCategorias(), nunca se trata como una
   categoría de producto real. */
function obtenerCategorias(listaProductos) {
    const vistas = new Set();
    const categorias = [];

    listaProductos.forEach((producto) => {
        const cat = producto.categoria;
        if (typeof cat !== "string") return;

        const limpia = cat.trim();
        if (!limpia || vistas.has(limpia)) return;

        vistas.add(limpia);
        categorias.push(limpia);
    });

    return categorias;
}

/* Etiqueta visible para una categoría real (capitaliza la primera letra
   — "bolsas" -> "Bolsas"). Nunca traduce/inventa nombres distintos al
   valor real guardado en el producto (ese valor real es el que se sigue
   usando para filtrar/comparar, esto es solo presentación). */
function etiquetaCategoria(categoria) {
    if (!categoria) return "";
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
}

function renderCategorias(categoriasReales) {
    const contenedor = document.getElementById("catalogo-categorias");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    const opciones = [{ valor: "todos", etiqueta: "Todos" }].concat(
        categoriasReales.map((cat) => ({ valor: cat, etiqueta: etiquetaCategoria(cat) }))
    );

    opciones.forEach((opcion) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "catalogo__categoria-btn";
        boton.textContent = opcion.etiqueta;
        boton.dataset.categoria = opcion.valor;

        // 🔥 §41: el estado seleccionado no depende únicamente del color —
        // aria-pressed lo comunica también a tecnología asistiva.
        const activa = catalogoEstado.categoria === opcion.valor;
        boton.classList.toggle("is-active", activa);
        boton.setAttribute("aria-pressed", activa ? "true" : "false");

        boton.addEventListener("click", () => {
            catalogoEstado.categoria = opcion.valor;
            sincronizarUrlCategoria();
            renderCategorias(categoriasReales); // refleja el nuevo botón activo
            aplicarFiltrosYOrden();
        });

        contenedor.appendChild(boton);
    });
}

/* 🔥 §39/§40 — query param ?categoria=<slug>, preparado para que un futuro
   menú (Feature 07B) pueda entrar ya filtrado. Solo acepta categorías
   REALES (obtenerCategorias()); un valor inválido se ignora de forma
   segura y se muestra "Todos" — nunca rompe el catálogo ni deja un
   filtro "fantasma" aplicado. */
function leerCategoriaDesdeUrl(categoriasReales) {
    const params = new URLSearchParams(window.location.search);
    const valor = params.get("categoria");
    if (!valor) return "todos";

    return categoriasReales.includes(valor) ? valor : "todos";
}

/* Mantiene ?categoria= sincronizado con el filtro activo usando
   replaceState (§40: nunca llena el historial con una entrada por cada
   cambio de filtro) — nunca toca ?aviso= si ya fue limpiado antes (ver
   procesarAvisoOfertas()). */
function sincronizarUrlCategoria() {
    if (!window.history || typeof window.history.replaceState !== "function") return;

    const params = new URLSearchParams(window.location.search);
    if (catalogoEstado.categoria === "todos") {
        params.delete("categoria");
    } else {
        params.set("categoria", catalogoEstado.categoria);
    }

    const query = params.toString();
    const nuevaUrl = window.location.pathname + (query ? `?${query}` : "");
    window.history.replaceState(null, "", nuevaUrl);
}

/* 🔥 §12 — "Ofertas" (index.html y el propio productos.html) navega aquí
   con ?aviso=ofertas. Se muestra el MISMO aviso de siempre (mostrarToast,
   ya usado por el resto del sitio) una sola vez al cargar, y se limpia el
   parámetro de la URL (replaceState) para que un refresh posterior no lo
   repita ni quede visible en la barra de direcciones. */
function procesarAvisoOfertas() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("aviso") !== "ofertas") return;

    if (typeof mostrarToast === "function") {
        mostrarToast(null, {
            tipo: "info",
            mensaje: "Por el momento no hay ofertas disponibles.",
        });
    }

    params.delete("aviso");
    const query = params.toString();
    const nuevaUrl = window.location.pathname + (query ? `?${query}` : "");
    if (window.history && typeof window.history.replaceState === "function") {
        window.history.replaceState(null, "", nuevaUrl);
    }
}

/* 🔥 §8/§11 — el link "Productos" del header, en ESTA página, es la
   página actual: se marca de forma estática (nunca por scroll-spy, aquí
   no hay secciones que scrollear) con el mismo lenguaje de accesibilidad
   ya usado en el resto de la navegación (clase .is-active + aria-current,
   aquí "page" en vez de "location" porque es la página completa, no una
   sección dentro de ella). */
function marcarNavProductosComoPaginaActual() {
    const link = document.getElementById("nav-productos");
    if (!link) return;

    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");
}

/* Aplica búsqueda + categoría + disponibilidad + precio, en ese orden, y
   luego el orden seleccionado — todo sobre el arreglo real de
   data/productos.js, nunca sobre una copia mutada de él. */
function calcularProductosFiltrados() {
    const termino = catalogoEstado.busqueda.trim().toLowerCase();

    let resultado = productos.filter((producto) => {
        if (catalogoEstado.categoria !== "todos" && producto.categoria !== catalogoEstado.categoria) {
            return false;
        }

        // §21: stock===0 puede seguir apareciendo cuando el filtro NO está
        // activo (comportamiento actual, sin cambios) — solo se excluye
        // cuando "En existencia" está marcado.
        if (catalogoEstado.enExistencia && !(Number(producto.stock) > 0)) {
            return false;
        }

        if (catalogoEstado.precioMin !== null && Number(producto.precio) < catalogoEstado.precioMin) {
            return false;
        }
        if (catalogoEstado.precioMax !== null && Number(producto.precio) > catalogoEstado.precioMax) {
            return false;
        }

        if (termino) {
            const nombre = String(producto.nombre || "").toLowerCase();
            const categoria = String(producto.categoria || "").toLowerCase();
            if (!nombre.includes(termino) && !categoria.includes(termino)) return false;
        }

        return true;
    });

    switch (catalogoEstado.orden) {
        case "precio-asc":
            resultado = resultado.slice().sort((a, b) => Number(a.precio) - Number(b.precio));
            break;
        case "precio-desc":
            resultado = resultado.slice().sort((a, b) => Number(b.precio) - Number(a.precio));
            break;
        case "nombre-az":
            resultado = resultado.slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
            break;
        case "predeterminado":
        default:
            // Sin reordenar: el orden real de data/productos.js (spec §23:
            // no inventar un ranking de "más vendidos"/"mejor valorados").
            break;
    }

    return resultado;
}

function renderCatalogo() {
    const grid = document.getElementById("catalogo-grid");
    const contador = document.getElementById("catalogo-contador");
    const sinResultados = document.getElementById("catalogo-sin-resultados");
    if (!grid) return;

    const filtrados = calcularProductosFiltrados();

    grid.innerHTML = "";

    // 🔥 Feature 04 (mismo criterio de rendimiento que la Home): primera
    // fila eager, resto lazy — crearCard() ya lo decide, se reutiliza tal
    // cual (spec §30/§42, sin duplicar el criterio).
    filtrados.forEach((producto, indice) => {
        grid.appendChild(crearCard(producto, indice < 4));
    });

    if (contador) {
        contador.textContent = `${filtrados.length} producto${filtrados.length === 1 ? "" : "s"}`;
    }

    const hayResultados = filtrados.length > 0;
    grid.hidden = !hayResultados;
    if (sinResultados) sinResultados.hidden = hayResultados;
}

/* 🔥 Ajuste UX (revisión previa a commit, §7): "Limpiar filtros" no debe
   parecer la acción principal de la sidebar cuando no hay NINGÚN filtro
   aplicado (nunca se deshabilita de verdad — sigue siendo utilizable en
   cualquier momento, spec: "puede permanecer disponible... visualmente
   secundario"), y debe verse claramente utilizable en cuanto existe algo
   que limpiar. Se audita el estado real (catalogoEstado) en vez de
   asumir — "hay algo que limpiar" es exactamente "algún valor distinto
   de su default". No se modifica la lógica de limpiarFiltros() en sí
   (spec: "no modificar la lógica actual de limpiar"), solo se refleja
   visualmente cuándo tiene sentido usarla. */
function hayFiltrosActivos() {
    return (
        catalogoEstado.busqueda.trim() !== "" ||
        catalogoEstado.categoria !== "todos" ||
        catalogoEstado.enExistencia ||
        catalogoEstado.precioMin !== null ||
        catalogoEstado.precioMax !== null ||
        catalogoEstado.orden !== "predeterminado"
    );
}

function actualizarEstadoBotonLimpiar() {
    const activos = hayFiltrosActivos();
    document.querySelectorAll(".catalogo__limpiar").forEach((boton) => {
        boton.classList.toggle("catalogo__limpiar--secundario", !activos);
    });
}

function aplicarFiltrosYOrden() {
    renderCatalogo();
    actualizarEstadoBotonLimpiar();
}

/* 🔥 §26 — restaura todos los filtros a su estado por defecto, sin
   recargar la página, y refleja ese reseteo en cada control de la UI
   (nunca deja un control mostrando un valor que el estado ya no tiene). */
function limpiarFiltros(categoriasReales) {
    catalogoEstado.busqueda = "";
    catalogoEstado.categoria = "todos";
    catalogoEstado.enExistencia = false;
    catalogoEstado.precioMin = null;
    catalogoEstado.precioMax = null;
    catalogoEstado.orden = "predeterminado";

    const inputBuscar = document.getElementById("catalogo-buscar");
    const checkExistencia = document.getElementById("catalogo-en-existencia");
    const inputMin = document.getElementById("catalogo-precio-min");
    const inputMax = document.getElementById("catalogo-precio-max");
    const selectOrden = document.getElementById("catalogo-orden");

    if (inputBuscar) inputBuscar.value = "";
    if (checkExistencia) checkExistencia.checked = false;
    if (inputMin) inputMin.value = "";
    if (inputMax) inputMax.value = "";
    if (selectOrden) selectOrden.value = "predeterminado";

    renderCategorias(categoriasReales);
    sincronizarUrlCategoria();
    aplicarFiltrosYOrden();
}

/* 🔥 §28 (+ ajuste UX previo a commit) — panel de filtros: sidebar
   siempre visible en desktop (CSS), panel desplegable (drawer) en mobile
   controlado por este toggle. Mismo lenguaje de accesibilidad que el
   resto del sitio (aria-expanded sincronizado, Escape cierra, clic fuera
   cierra, ahora también un botón [X] real en la cabecera del drawer) —
   sin duplicar la lógica exacta del menú hamburguesa/carrito (son
   componentes distintos), pero con el mismo comportamiento esperado:
     - Cierra por X, Escape y clic/tap en el overlay.
     - NUNCA se cierra solo porque el usuario elige una categoría — el
       usuario decide cuándo terminar de combinar categoría+stock+precio
       (renderCategorias() no llama a cerrar() en ningún punto).
     - Bloquea el scroll del fondo SOLO en mobile (breakpoint <992px,
       donde el panel es un drawer superpuesto) reutilizando
       bloquearScrollFondo()/desbloquearScrollFondo() de js/app.js (mismas
       funciones que ya usan el modal de producto y el carrito) — con su
       propia bandera "de verdad se bloqueó" (mismo patrón que
       carritoBloqueadoComoModal en js/carrito.js), para nunca desbloquear
       algo que no bloqueó este panel. En desktop (sidebar siempre
       visible, nunca un overlay) nunca bloquea nada.
     - Foco: al abrir, va al botón [X] (spec: "botón Cerrar o el
       encabezado"); al cerrar, vuelve al botón "Filtros" que lo abrió.
       Ambos con { preventScroll: true } — el panel/botón ya están
       visibles, este focus() nunca debe mover la página de fondo.
   No es un modal: no implementa focus trap completo (spec §28: "no
   implementar un sistema excesivamente complejo"), como ya se decidió en
   la ronda anterior. */
let catalogoFiltrosAbiertos = false;
let catalogoFiltrosBloqueoFondoActivo = false;

const MEDIA_QUERY_CATALOGO_FILTROS_DRAWER = window.matchMedia("(max-width: 991px)");

function activarPanelFiltrosMobile() {
    const toggle = document.getElementById("catalogo-filtros-toggle");
    const panel = document.getElementById("catalogo-filtros");
    const overlay = document.getElementById("catalogo-filtros-overlay");
    const botonCerrar = document.getElementById("catalogo-filtros-cerrar");
    if (!toggle || !panel) return;

    function esDrawer() {
        return MEDIA_QUERY_CATALOGO_FILTROS_DRAWER.matches;
    }

    function abrir() {
        // 🔥 Consistencia con el resto del sitio (abrirCarrito() cierra el
        // menú mobile primero, abrirModal() cierra el menú mobile primero):
        // nunca deben quedar dos overlays/drawers superpuestos a la vez.
        if (typeof cerrarCarrito === "function") {
            const cartPanel = document.getElementById("cart-panel");
            if (cartPanel && cartPanel.classList.contains("active")) cerrarCarrito();
        }
        if (typeof cerrarMenuMobile === "function") cerrarMenuMobile();

        catalogoFiltrosAbiertos = true;
        panel.classList.add("catalogo__filtros--open");
        if (overlay) overlay.classList.add("catalogo__filtros-overlay--visible");
        toggle.setAttribute("aria-expanded", "true");

        if (esDrawer()) {
            bloquearScrollFondo();
            catalogoFiltrosBloqueoFondoActivo = true;
        }

        // Foco inicial en el botón Cerrar (spec ajuste UX §4) — preventScroll
        // porque el panel ya es visible, este focus() no debe desplazar nada.
        if (botonCerrar) botonCerrar.focus({ preventScroll: true });
    }

    function cerrar(opciones = {}) {
        catalogoFiltrosAbiertos = false;
        panel.classList.remove("catalogo__filtros--open");
        if (overlay) overlay.classList.remove("catalogo__filtros-overlay--visible");
        toggle.setAttribute("aria-expanded", "false");

        // Solo desbloquea si este panel bloqueó de verdad (misma cautela que
        // carritoBloqueadoComoModal): nunca desbloquear/mover el scroll de
        // fondo si nunca se bloqueó desde aquí (p. ej. si el panel se abrió
        // en desktop y luego se hizo resize a mobile sin haber bloqueado).
        if (catalogoFiltrosBloqueoFondoActivo) {
            desbloquearScrollFondo();
            catalogoFiltrosBloqueoFondoActivo = false;
        }

        if (opciones.devolverFoco !== false) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener("click", () => {
        if (catalogoFiltrosAbiertos) {
            cerrar();
        } else {
            abrir();
        }
    });

    if (botonCerrar) {
        botonCerrar.addEventListener("click", () => cerrar());
    }

    if (overlay) {
        overlay.addEventListener("click", () => cerrar());
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && catalogoFiltrosAbiertos) {
            cerrar();
        }
    });

    // 🔥 Resize/rotación con el panel abierto (mismo criterio que
    // MEDIA_QUERY_CARRITO_MODAL en js/carrito.js): si cruza a desktop
    // mientras está abierto, libera el bloqueo que ya no aplica; si cruza
    // a mobile, no fuerza un bloqueo retroactivo (el panel ya estaba
    // abierto sin haber bloqueado nada, y forzarlo ahora sería más
    // sorprendente que consistente) — el próximo abrir()/cerrar() ya
    // queda sincronizado con el modo real.
    MEDIA_QUERY_CATALOGO_FILTROS_DRAWER.addEventListener("change", () => {
        if (!catalogoFiltrosAbiertos) return;
        if (!esDrawer() && catalogoFiltrosBloqueoFondoActivo) {
            desbloquearScrollFondo();
            catalogoFiltrosBloqueoFondoActivo = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("catalogo-grid");
    if (!grid) return; // esta página no es productos.html (o el catálogo aún no existe): no hacer nada

    procesarAvisoOfertas();
    marcarNavProductosComoPaginaActual();

    const categoriasReales = obtenerCategorias(productos);
    catalogoEstado.categoria = leerCategoriaDesdeUrl(categoriasReales);

    renderCategorias(categoriasReales);
    activarPanelFiltrosMobile();

    const inputBuscar = document.getElementById("catalogo-buscar");
    const checkExistencia = document.getElementById("catalogo-en-existencia");
    const inputMin = document.getElementById("catalogo-precio-min");
    const inputMax = document.getElementById("catalogo-precio-max");
    const selectOrden = document.getElementById("catalogo-orden");
    const botonLimpiar = document.getElementById("catalogo-limpiar-filtros");
    const botonLimpiarVacio = document.querySelector('[data-accion="limpiar-desde-vacio"]');

    if (inputBuscar) {
        inputBuscar.addEventListener("input", () => {
            catalogoEstado.busqueda = inputBuscar.value;
            aplicarFiltrosYOrden();
        });
    }

    if (checkExistencia) {
        checkExistencia.addEventListener("change", () => {
            catalogoEstado.enExistencia = checkExistencia.checked;
            aplicarFiltrosYOrden();
        });
    }

    function leerPrecio(input) {
        const valor = input.value.trim();
        if (valor === "") return null;
        const numero = Number(valor);
        return Number.isFinite(numero) && numero >= 0 ? numero : null;
    }

    if (inputMin) {
        inputMin.addEventListener("input", () => {
            catalogoEstado.precioMin = leerPrecio(inputMin);
            aplicarFiltrosYOrden();
        });
    }

    if (inputMax) {
        inputMax.addEventListener("input", () => {
            catalogoEstado.precioMax = leerPrecio(inputMax);
            aplicarFiltrosYOrden();
        });
    }

    if (selectOrden) {
        selectOrden.addEventListener("change", () => {
            catalogoEstado.orden = selectOrden.value;
            aplicarFiltrosYOrden();
        });
    }

    if (botonLimpiar) {
        botonLimpiar.addEventListener("click", () => limpiarFiltros(categoriasReales));
    }
    if (botonLimpiarVacio) {
        botonLimpiarVacio.addEventListener("click", () => limpiarFiltros(categoriasReales));
    }

    aplicarFiltrosYOrden();
});
