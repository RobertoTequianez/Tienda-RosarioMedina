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

/* Estado centralizado de filtros/orden del catálogo — ESTOS SON LOS
   "filtrosAplicados": el catálogo visible (grid, contador, chips, URL)
   SIEMPRE refleja este objeto, nunca un valor a medio camino. Única fuente
   de verdad para lo aplicado — todas las funciones de abajo leen/escriben
   aquí (directamente en desktop, o vía estadoEditable() en mobile). */
const catalogoEstado = {
    busqueda: "",
    categoria: "todos",
    enExistencia: false,
    precioMin: null,
    precioMax: null,
    orden: "predeterminado",
};

/* 🔥 Ajuste UX (corrección post-candidato): "filtrosDraft" — copia
   temporal de catalogoEstado que existe SOLO mientras el drawer mobile
   está abierto (spec §2/§3). Mientras exista, categoría/disponibilidad/
   precio se editan aquí, NUNCA directamente en catalogoEstado — así el
   catálogo detrás del panel no se re-renderiza en cada cambio. Al cerrar:
   se copia a catalogoEstado (Aplicar) o se descarta (X/overlay/Escape).
   null cuando no hay draft activo (desktop, o drawer cerrado). */
let filtrosDraft = null;

/* 🔥 Corrección FINAL de validación de inputs (ronda "inputs", posterior
   al pulido visual): true mientras el precio (min y/o max) del draft
   mobile tenga un error de formato o de rango sin corregir — controla
   si "Ver N productos" debe estar deshabilitado (spec punto 13: NO se
   puede aplicar un filtro con un precio inválido). Se resetea a false
   cada vez que el drawer se sincroniza con un estado ya válido (abrir,
   descartar, limpiar). No afecta a desktop, donde nunca hay botón que
   deshabilitar: el estado simplemente no se actualiza mientras haya
   error (ver sincronizarPrecio). */
let catalogoPrecioTieneError = false;

/* Búsqueda y orden NO forman parte del draft (viven en la toolbar, fuera
   del drawer, y siempre fueron instantáneos — spec §3 solo menciona
   categoría+stock+precio). "Modo draft" está activo únicamente en
   mobile (breakpoint del drawer) mientras existe una copia draft. */
function modoDraftActivo() {
    return MEDIA_QUERY_CATALOGO_FILTROS_DRAWER.matches && filtrosDraft !== null;
}

/* El "estado editable" es a donde escriben los controles de
   categoría/disponibilidad/precio: el draft si está activo, o
   catalogoEstado (aplicado) directamente en cualquier otro caso
   (desktop, o mobile con el drawer cerrado). Mismo motor de filtrado
   para ambos casos — nunca dos implementaciones paralelas. */
function estadoEditable() {
    return modoDraftActivo() ? filtrosDraft : catalogoEstado;
}

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

    // 🔥 Ajuste UX (corrección post-candidato §3): lee/pinta contra el
    // estado EDITABLE (draft si el drawer mobile está abierto, aplicado en
    // cualquier otro caso) — en desktop esto es siempre catalogoEstado, sin
    // cambio de comportamiento.
    const estado = estadoEditable();

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
        const activa = estado.categoria === opcion.valor;
        boton.classList.toggle("is-active", activa);
        boton.setAttribute("aria-pressed", activa ? "true" : "false");

        boton.addEventListener("click", () => {
            estadoEditable().categoria = opcion.valor;

            if (modoDraftActivo()) {
                // 🔥 §2/§3: mobile con drawer abierto — SOLO el draft
                // cambia; el catálogo detrás no se re-renderiza, solo el
                // preview del CTA "Ver N productos".
                renderCategorias(categoriasReales);
                actualizarPreviewMobile();
                actualizarEstadoBotonLimpiar();
            } else {
                // Desktop (o mobile con drawer cerrado): comportamiento
                // original, filtrado instantáneo.
                sincronizarUrlCategoria();
                renderCategorias(categoriasReales);
                aplicarFiltrosYOrden();
            }
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

/* 🔥 Ronda final de pulido (spec §21/§26): elimina cualquier carácter
   fuera del set permitido (letras Unicode con acentos/ñ vía \p{L},
   números vía \p{N}, espacios, guion, apóstrofe, &, punto, /) — rechaza
   así control chars, < >, llaves y cualquier "basura" fuera de ese set,
   sin bloquear el input entero (solo se descarta lo no permitido, letra
   por letra). Se aplica también al pegar (paste dispara su propio evento
   "input", cubierto por el mismo listener — sin manejador separado). */
function sanearBusqueda(valorCrudo) {
    return String(valorCrudo).replace(/[^\p{L}\p{N}\s\-'&./]/gu, "");
}

/* 🔥 Corrección FINAL de validación de inputs (ronda "inputs"): la
   versión anterior de este archivo saneaba destructivamente cada
   pulsación/pegado — "-1" se convertía en "1", "1e10" en "110", "1.2.3"
   en "1.23", "999.999" en "999.99". Evitaba caracteres fuera del set
   permitido, pero REINTERPRETABA silenciosamente la intención de la
   persona (un "-1" no es "olvidé no escribir el signo", es un valor que
   la persona probablemente no quiso escribir así). Se reemplaza por un
   analizador que NUNCA reescribe el texto: el campo conserva
   exactamente lo que la persona escribió o pegó, y esta función solo
   CLASIFICA esa cadena — nunca decide qué "quiso decir".

   Devuelve:
     - { estado: "vacio", valor: null }              — campo sin texto (= sin límite)
     - { estado: "formato_invalido", valor: null }   — la cadena no es un
       número simple de hasta 2 decimales (signos +/-, notación
       científica, letras, texto, más de un punto, más de 2 decimales,
       "." o ".." solos, etc.) — ERROR DE FORMATO.
     - { estado: "valido", valor: <Number> }         — formato correcto;
       si ese número está fuera del rango real del catálogo, quien llama
       decide eso por separado (ERROR DE RANGO, distinto de formato). */
function analizarTextoPrecio(valorCrudo) {
    const texto = String(valorCrudo).trim();
    if (texto === "") return { estado: "vacio", valor: null };
    // Único separador decimal aceptado: el punto. Dígitos obligatorios
    // antes del punto, punto opcional, hasta 2 dígitos decimales si hay
    // punto. Cualquier otra cosa (signo, "e"/"E", coma, letras, segundo
    // punto, 3+ decimales) no matchea y queda como formato inválido.
    const formatoValido = /^\d+(\.\d{1,2})?$/.test(texto);
    if (!formatoValido) return { estado: "formato_invalido", valor: null };
    return { estado: "valido", valor: Number(texto) };
}

/* Aplica búsqueda + categoría + disponibilidad + precio, en ese orden, y
   luego el orden seleccionado — todo sobre el arreglo real de
   data/productos.js, nunca sobre una copia mutada de él.

   🔥 Ajuste UX (corrección post-candidato §2/§4): recibe el estado a
   filtrar como parámetro (por defecto catalogoEstado, lo aplicado) — es
   EL MISMO motor que usa tanto el render real (contra catalogoEstado)
   como el preview del drawer mobile (contra filtrosDraft, spec: "el
   mismo motor de filtrado debe servir para ambos... NO duplicar dos
   implementaciones de filtros"). */
function calcularProductosFiltrados(estado = catalogoEstado) {
    // 🔥 Ronda final de pulido (spec §27): trim + colapsar espacios
    // consecutivos + case-insensitive — Unicode (acentos/ñ) intacto,
    // nunca alterado por esta normalización (no hay ninguna
    // transliteración, solo espacios/mayúsculas).
    const termino = estado.busqueda.trim().replace(/\s+/g, " ").toLowerCase();

    let resultado = productos.filter((producto) => {
        if (estado.categoria !== "todos" && producto.categoria !== estado.categoria) {
            return false;
        }

        // §21: stock===0 puede seguir apareciendo cuando el filtro NO está
        // activo (comportamiento actual, sin cambios) — solo se excluye
        // cuando "En existencia" está marcado.
        if (estado.enExistencia && !(Number(producto.stock) > 0)) {
            return false;
        }

        if (estado.precioMin !== null && Number(producto.precio) < estado.precioMin) {
            return false;
        }
        if (estado.precioMax !== null && Number(producto.precio) > estado.precioMax) {
            return false;
        }

        if (termino) {
            const nombre = String(producto.nombre || "").toLowerCase();
            const categoria = String(producto.categoria || "").toLowerCase();
            if (!nombre.includes(termino) && !categoria.includes(termino)) return false;
        }

        return true;
    });

    switch (estado.orden) {
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

    // Siempre contra lo APLICADO — el grid detrás del drawer nunca debe
    // re-renderizarse por cambios de un draft todavía no confirmado.
    const filtrados = calcularProductosFiltrados(catalogoEstado);

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
function hayFiltrosActivos(estado = catalogoEstado) {
    return (
        estado.busqueda.trim() !== "" ||
        estado.categoria !== "todos" ||
        estado.enExistencia ||
        estado.precioMin !== null ||
        estado.precioMax !== null ||
        estado.orden !== "predeterminado"
    );
}

/* 🔥 Ajuste UX (corrección post-candidato §7): el botón "Limpiar filtros"
   vive tanto en el drawer/sidebar (#catalogo-limpiar-filtros, un único
   elemento reutilizado en ambos layouts) como en el estado vacío
   (data-accion="limpiar-desde-vacio", siempre atado a lo APLICADO — no
   existe fuera de un resultado ya renderizado). Cada uno refleja su
   propio estado relevante: el del drawer sigue el draft mientras existe
   (para no verse "inactivo" mientras el usuario arma una combinación
   todavía sin confirmar), el del estado vacío siempre sigue lo aplicado. */
function actualizarEstadoBotonLimpiar() {
    const botonVacio = document.querySelector('[data-accion="limpiar-desde-vacio"]');
    if (botonVacio) {
        botonVacio.classList.toggle("catalogo__limpiar--secundario", !hayFiltrosActivos(catalogoEstado));
    }

    const botonDrawer = document.getElementById("catalogo-limpiar-filtros");
    if (botonDrawer) {
        const estadoRelevante = filtrosDraft || catalogoEstado;
        botonDrawer.classList.toggle("catalogo__limpiar--secundario", !hayFiltrosActivos(estadoRelevante));
    }
}

/* 🔥 Ajuste UX (corrección post-candidato §19): cantidad de GRUPOS de
   filtro activos (no de productos) reflejados en el propio catálogo
   APLICADO — categoría, disponibilidad y precio cuentan como un grupo
   cada uno (min y max juntos son un solo grupo "precio"). */
function contarGruposFiltrosActivos(estado = catalogoEstado) {
    let grupos = 0;
    if (estado.categoria !== "todos") grupos++;
    if (estado.enExistencia) grupos++;
    if (estado.precioMin !== null || estado.precioMax !== null) grupos++;
    return grupos;
}

function actualizarContadorFiltrosBoton() {
    const toggle = document.getElementById("catalogo-filtros-toggle");
    if (!toggle) return;
    const grupos = contarGruposFiltrosActivos(catalogoEstado);
    toggle.textContent = grupos > 0 ? `Filtros (${grupos})` : "Filtros";
}

/* 🔥 Ajuste UX (corrección post-candidato §11): chips discretos de
   filtros APLICADOS realmente activos, mostrados encima del grid de
   resultados. Nunca un chip para "Todos" (no es un filtro real). Cada
   chip es un <button> real que quita SOLO ese filtro y vuelve a aplicar
   de inmediato — mismo motor de estado/filtrado que el resto (nunca una
   copia paralela). categoriasRealesActual se completa una sola vez en
   DOMContentLoaded (ver más abajo). */
let categoriasRealesActual = [];

function renderChipsActivos() {
    const contenedor = document.getElementById("catalogo-chips");
    if (!contenedor) return;

    contenedor.innerHTML = "";
    const chips = [];

    if (catalogoEstado.categoria !== "todos") {
        chips.push({ tipo: "categoria", etiqueta: etiquetaCategoria(catalogoEstado.categoria) });
    }
    if (catalogoEstado.enExistencia) {
        chips.push({ tipo: "existencia", etiqueta: "En existencia" });
    }
    if (catalogoEstado.precioMin !== null || catalogoEstado.precioMax !== null) {
        // 🔥 Ronda final de pulido (spec §2/§3/§31): mismo
        // formatearPrecioMXN() que el resto del sitio — nunca un segundo
        // formato de precio armado a mano (ni siquiera en el chip).
        const min = formatearPrecioMXN(catalogoEstado.precioMin !== null ? catalogoEstado.precioMin : 0);
        const etiqueta = catalogoEstado.precioMax !== null
            ? `${min} – ${formatearPrecioMXN(catalogoEstado.precioMax)}`
            : `Desde ${min}`;
        chips.push({ tipo: "precio", etiqueta });
    }

    chips.forEach((chip) => {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "catalogo__chip";
        boton.setAttribute("aria-label", `Quitar filtro: ${chip.etiqueta}`);
        boton.innerHTML = `<span>${chip.etiqueta}</span><span aria-hidden="true">&times;</span>`;

        boton.addEventListener("click", () => {
            if (chip.tipo === "categoria") {
                catalogoEstado.categoria = "todos";
                sincronizarUrlCategoria();
                renderCategorias(categoriasRealesActual);
            } else if (chip.tipo === "existencia") {
                catalogoEstado.enExistencia = false;
                const check = document.getElementById("catalogo-en-existencia");
                if (check) check.checked = false;
            } else if (chip.tipo === "precio") {
                catalogoEstado.precioMin = null;
                catalogoEstado.precioMax = null;
                const inputMin = document.getElementById("catalogo-precio-min");
                const inputMax = document.getElementById("catalogo-precio-max");
                const elError = document.getElementById("catalogo-precio-error");
                if (inputMin) {
                    inputMin.value = "";
                    inputMin.removeAttribute("aria-invalid");
                }
                if (inputMax) {
                    inputMax.value = "";
                    inputMax.removeAttribute("aria-invalid");
                }
                if (elError) elError.textContent = "";
            }
            aplicarFiltrosYOrden();
        });

        contenedor.appendChild(boton);
    });

    // 🔥 Ronda final de pulido (spec §7): YA NO se usa `hidden` (eso
    // sacaba el contenedor del flujo por completo, sin reservar ningún
    // espacio) — el modificador --vacio deja que el CSS decida cuánto
    // colapsar según el breakpoint (nada en mobile, una línea reservada
    // en desktop). Ver scss/_catalogo.scss.
    contenedor.classList.toggle("catalogo__chips--vacio", chips.length === 0);
}

/* 🔥 Ajuste UX (corrección post-candidato §4): actualiza SOLO el CTA
   "Ver N productos" del drawer mobile contra el draft (calculado en
   memoria con el mismo motor de calcularProductosFiltrados) — nunca
   toca el grid real detrás del panel. Permite explícitamente llegar a
   "Ver 0 productos" (spec §4: "permitir aplicar para mostrar
   correctamente el estado sin resultados" — nunca deshabilitado). */
function actualizarPreviewMobile() {
    const boton = document.getElementById("catalogo-filtros-aplicar");
    if (!boton || !filtrosDraft) return;

    const cantidad = calcularProductosFiltrados(filtrosDraft).length;
    boton.textContent = `Ver ${cantidad} producto${cantidad === 1 ? "" : "s"}`;
}

function aplicarFiltrosYOrden() {
    renderCatalogo();
    actualizarEstadoBotonLimpiar();
    renderChipsActivos();
    actualizarContadorFiltrosBoton();
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
    if (inputMin) {
        inputMin.value = "";
        inputMin.removeAttribute("aria-invalid"); // §23/§24: limpiar también borra cualquier error de precio visible
    }
    if (inputMax) {
        inputMax.value = "";
        inputMax.removeAttribute("aria-invalid");
    }
    const elErrorPrecio = document.getElementById("catalogo-precio-error");
    if (elErrorPrecio) elErrorPrecio.textContent = "";
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

/* Refleja los controles del drawer (categoría/disponibilidad/precio)
   contra un estado dado — usado tanto al abrir (copiar aplicado→draft,
   aunque en ese instante son idénticos) como al descartar al cerrar
   (draft→null, controles deben volver a mostrar lo realmente aplicado,
   spec §6: "cuando vuelva a abrir, los controles deben reflejar
   nuevamente los filtros realmente aplicados"). */
function sincronizarControlesDrawer(estado, categoriasReales) {
    renderCategorias(categoriasReales); // lee estadoEditable() internamente
    const checkExistencia = document.getElementById("catalogo-en-existencia");
    const inputMin = document.getElementById("catalogo-precio-min");
    const inputMax = document.getElementById("catalogo-precio-max");
    if (checkExistencia) checkExistencia.checked = estado.enExistencia;
    if (inputMin) {
        inputMin.value = estado.precioMin === null ? "" : String(estado.precioMin);
        inputMin.removeAttribute("aria-invalid"); // estado siempre es el último válido: nunca hay error que mostrar aquí
    }
    if (inputMax) {
        inputMax.value = estado.precioMax === null ? "" : String(estado.precioMax);
        inputMax.removeAttribute("aria-invalid");
    }
    const elErrorPrecio = document.getElementById("catalogo-precio-error");
    if (elErrorPrecio) elErrorPrecio.textContent = "";

    // 🔥 Corrección FINAL de inputs (punto 13): estado siempre es el
    // último válido, así que al (re)sincronizar los controles contra él
    // nunca hay un error de precio real que mantener — se limpia el
    // flag y se rehabilita "Ver N productos" si estaba deshabilitado.
    catalogoPrecioTieneError = false;
    const botonAplicarPrecio = document.getElementById("catalogo-filtros-aplicar");
    if (botonAplicarPrecio) botonAplicarPrecio.disabled = false;
}

function activarPanelFiltrosMobile(categoriasReales) {
    const toggle = document.getElementById("catalogo-filtros-toggle");
    const panel = document.getElementById("catalogo-filtros");
    const overlay = document.getElementById("catalogo-filtros-overlay");
    const botonCerrar = document.getElementById("catalogo-filtros-cerrar");
    const botonAplicar = document.getElementById("catalogo-filtros-aplicar");
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

        // 🔥 Ajuste UX (corrección post-candidato §3): al abrir, se copia
        // el estado aplicado a un draft temporal — mientras exista, los
        // controles del panel editan el draft, nunca lo aplicado
        // directamente (solo en breakpoint mobile; en desktop el sidebar
        // nunca pasa por aquí, ver toggle oculto en CSS ≥992px).
        if (esDrawer()) {
            filtrosDraft = { ...catalogoEstado };
            sincronizarControlesDrawer(filtrosDraft, categoriasReales);
            actualizarPreviewMobile();
            actualizarEstadoBotonLimpiar();
        }

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

        // 🔥 Ajuste UX (corrección post-candidato §6): cerrar por X/overlay/
        // Escape (es decir, cualquier cierre que NO pasó por aplicar())
        // DESCARTA el draft sin preguntar — lo aplicado no cambia, y los
        // controles vuelven a reflejarlo para la próxima apertura.
        if (filtrosDraft) {
            filtrosDraft = null;
            sincronizarControlesDrawer(catalogoEstado, categoriasReales);
            actualizarEstadoBotonLimpiar();
        }

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

    /* 🔥 Ajuste UX (corrección post-candidato §5): "VER N PRODUCTOS" —
       1. copia draft→aplicado, 2. renderiza catálogo, 3. sincroniza
       controles/UI, 4. contador (ya dentro de renderCatalogo), 5. URL,
       6-7. cierra y devuelve foco (delegado en cerrar(), pero como el
       draft ya es null en ese punto, cerrar() ya NO descarta nada). */
    function aplicar() {
        if (!filtrosDraft) {
            cerrar();
            return;
        }

        // 🔥 Corrección FINAL de inputs (punto 13): guarda defensiva —
        // el CTA ya queda `disabled` mientras exista un precio inválido
        // (ver actualizarDisponibilidadAplicar en el bloque de precio),
        // pero esta comprobación evita aplicar un filtro con precio en
        // error si "aplicar()" se disparara por cualquier otra vía.
        if (catalogoPrecioTieneError) return;

        Object.assign(catalogoEstado, filtrosDraft); // 1
        filtrosDraft = null;

        renderCategorias(categoriasReales); // 3 — refleja ya lo aplicado
        aplicarFiltrosYOrden(); // 2 + 4: grid, contador, chips, Filtros(n)
        sincronizarUrlCategoria(); // 5

        cerrar(); // 6 + 7
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

    if (botonAplicar) {
        botonAplicar.addEventListener("click", () => aplicar());
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
    categoriasRealesActual = categoriasReales; // usado por chips (quitar categoría)
    catalogoEstado.categoria = leerCategoriaDesdeUrl(categoriasReales);

    renderCategorias(categoriasReales);
    activarPanelFiltrosMobile(categoriasReales);

    const inputBuscar = document.getElementById("catalogo-buscar");
    const checkExistencia = document.getElementById("catalogo-en-existencia");
    const inputMin = document.getElementById("catalogo-precio-min");
    const inputMax = document.getElementById("catalogo-precio-max");
    const selectOrden = document.getElementById("catalogo-orden");
    const botonLimpiar = document.getElementById("catalogo-limpiar-filtros");
    const botonLimpiarVacio = document.querySelector('[data-accion="limpiar-desde-vacio"]');

    // 🔥 Ajuste UX (corrección post-candidato §3): búsqueda y orden NO
    // forman parte del draft — viven en la toolbar, fuera del drawer, y
    // siguen siendo instantáneos siempre (desktop y mobile). Si hay un
    // draft activo en paralelo (drawer abierto), se refleja también ahí
    // para que el preview del CTA nunca quede con un valor obsoleto.
    if (inputBuscar) {
        inputBuscar.addEventListener("input", () => {
            // 🔥 Ronda final de pulido (spec §21/§26): saneo controlado
            // ANTES de leer el valor — cubre tipeo Y paste (ambos
            // disparan "input"), sin romper teclado mobile/IME (la
            // composición ya terminó cuando este evento se dispara).
            inputBuscar.value = sanearBusqueda(inputBuscar.value);
            catalogoEstado.busqueda = inputBuscar.value;
            if (filtrosDraft) filtrosDraft.busqueda = inputBuscar.value;
            aplicarFiltrosYOrden();
            if (filtrosDraft) actualizarPreviewMobile();
        });
    }

    if (selectOrden) {
        selectOrden.addEventListener("change", () => {
            catalogoEstado.orden = selectOrden.value;
            if (filtrosDraft) filtrosDraft.orden = selectOrden.value;
            aplicarFiltrosYOrden();
            if (filtrosDraft) actualizarPreviewMobile();
        });
    }

    // 🔥 Ajuste UX (corrección post-candidato §2/§3): disponibilidad y
    // precio SÍ forman parte del draft — mientras el drawer mobile está
    // abierto, escriben sobre estadoEditable() (el draft) y solo
    // actualizan el preview; en desktop (o drawer cerrado) escriben
    // directo sobre lo aplicado y renderizan de inmediato, exactamente
    // como antes.
    if (checkExistencia) {
        checkExistencia.addEventListener("change", () => {
            estadoEditable().enExistencia = checkExistencia.checked;
            if (modoDraftActivo()) {
                actualizarPreviewMobile();
                actualizarEstadoBotonLimpiar();
            } else {
                aplicarFiltrosYOrden();
            }
        });
    }

    // 🔥 Ronda final de pulido (spec §18/§22/§23/§24): precioMaximoCatalogo
    // se calcula SIEMPRE desde los precios REALES de `productos` — nunca
    // un valor fijo. Si mañana se agrega un producto más caro, este
    // cálculo lo recoge automáticamente sin tocar código.
    const precioMaximoCatalogo = productos.reduce(
        (max, p) => Math.max(max, Number(p.precio) || 0),
        0
    );
    // maxlength razonable derivado del máximo real (parte entera + ".XX")
    // — spec §22/punto 9: "no depender SOLO del maxlength", la validación
    // real (analizarTextoPrecio) es la que decide formato vs rango; este
    // atributo nativo solo evita cadenas absurdamente largas a nivel de
    // input. 🔥 Corrección FINAL de inputs (punto 9): el valor anterior
    // (dígitos enteros + 3) era TAN ajustado que el propio navegador
    // truncaba el texto ANTES de que nuestro JS pudiera clasificarlo —
    // por ejemplo "999.999" (7 caracteres, formato inválido: 3
    // decimales) se cortaba a "999.99" (válido, solo fuera de rango),
    // reclasificándolo silenciosamente de error de FORMATO a error de
    // RANGO sin que el usuario lo pidiera. Se amplía el margen (+6) para
    // que quepan los casos de prueba de formato inválido más largos
    // ("999.999", "Infinity") completos, dejando que sea SIEMPRE nuestra
    // validación — nunca el corte nativo — la que decida la causa del
    // error; el límite sigue existiendo para cadenas verdaderamente
    // absurdas (miles de caracteres pegados).
    const maxlengthPrecio = String(Math.floor(precioMaximoCatalogo)).length + 6;
    if (inputMin) inputMin.setAttribute("maxlength", String(maxlengthPrecio));
    if (inputMax) inputMax.setAttribute("maxlength", String(maxlengthPrecio));

    const elRangoPrecio = document.getElementById("catalogo-precio-rango");
    if (elRangoPrecio) {
        // 🔥 §19: mismo formatearPrecioMXN() que el resto del sitio — nunca
        // un segundo formato de precio paralelo, ni siquiera aquí.
        elRangoPrecio.textContent =
            `Rango disponible: ${formatearPrecioMXN(0)} – ${formatearPrecioMXN(precioMaximoCatalogo)}`;
    }

    const elErrorPrecio = document.getElementById("catalogo-precio-error");

    function mostrarErrorPrecio(inputsConError, mensaje) {
        if (elErrorPrecio) elErrorPrecio.textContent = mensaje;
        (Array.isArray(inputsConError) ? inputsConError : [inputsConError]).forEach((input) => {
            if (input) input.setAttribute("aria-invalid", "true");
        });
    }

    function limpiarErrorPrecio() {
        if (elErrorPrecio) elErrorPrecio.textContent = "";
        [inputMin, inputMax].forEach((input) => {
            if (input) input.removeAttribute("aria-invalid");
        });
    }

    const MENSAJE_FORMATO_PRECIO =
        "Ese precio no es válido. Escribe solo números, con hasta 2 decimales (ej. 199.50).";

    // 🔥 Corrección FINAL de inputs (punto 13): habilita/deshabilita "Ver
    // N productos" según si el precio del draft tiene un error sin
    // corregir. El texto del botón (el preview) no cambia por esto —
    // sigue reflejando el último conteo calculado — solo se bloquea la
    // posibilidad de aplicarlo mientras el precio esté en error.
    function actualizarDisponibilidadAplicar(hayError) {
        catalogoPrecioTieneError = hayError;
        const boton = document.getElementById("catalogo-filtros-aplicar");
        if (boton && filtrosDraft) boton.disabled = hayError;
    }

    /* 🔥 Corrección FINAL de validación de inputs: UN solo punto de
       verdad para ambos campos (se dispara desde cualquiera de los dos,
       porque cambiar uno puede volver inválido al otro — ej. bajar el
       máximo por debajo del mínimo ya cargado). El campo NUNCA se
       reescribe (ver analizarTextoPrecio) — se distingue ERROR DE
       FORMATO (la cadena no es un número de hasta 2 decimales: signos,
       notación científica, letras, más de un punto/decimal) de ERROR DE
       RANGO (formato correcto pero fuera de lo permitido: excede el
       máximo real, o min > max). En cualquiera de los dos casos NUNCA
       se escribe al estado de filtrado ("no clamp silencioso", ni
       reinterpretación): precioMin/precioMax conservan su ÚLTIMO valor
       válido hasta que la persona corrige el texto — el catálogo/preview
       no se mueven mientras tanto, con el error bien visible. En mobile,
       además, "Ver N productos" se deshabilita mientras el error exista
       (punto 13) — en desktop no hay botón que deshabilitar: el filtro
       simplemente no cambia (punto 14). */
    function sincronizarPrecio() {
        const anMin = analizarTextoPrecio(inputMin ? inputMin.value : "");
        const anMax = analizarTextoPrecio(inputMax ? inputMax.value : "");

        limpiarErrorPrecio();

        if (anMin.estado === "formato_invalido") {
            mostrarErrorPrecio(inputMin, MENSAJE_FORMATO_PRECIO);
            actualizarDisponibilidadAplicar(true);
            return;
        }
        if (anMax.estado === "formato_invalido") {
            mostrarErrorPrecio(inputMax, MENSAJE_FORMATO_PRECIO);
            actualizarDisponibilidadAplicar(true);
            return;
        }

        const numMin = anMin.estado === "vacio" ? null : anMin.valor;
        const numMax = anMax.estado === "vacio" ? null : anMax.valor;

        if (numMin !== null && numMin > precioMaximoCatalogo) {
            mostrarErrorPrecio(inputMin, `El precio máximo disponible es ${formatearPrecioMXN(precioMaximoCatalogo)}.`);
            actualizarDisponibilidadAplicar(true);
            return;
        }
        if (numMax !== null && numMax > precioMaximoCatalogo) {
            mostrarErrorPrecio(inputMax, `El precio máximo disponible es ${formatearPrecioMXN(precioMaximoCatalogo)}.`);
            actualizarDisponibilidadAplicar(true);
            return;
        }
        if (numMin !== null && numMax !== null && numMin > numMax) {
            mostrarErrorPrecio([inputMin, inputMax], "El precio mínimo no puede ser mayor al máximo.");
            actualizarDisponibilidadAplicar(true);
            return;
        }

        // Solo hasta aquí (ambos con formato válido, dentro de rango, y
        // min <= max — o vacíos = "sin límite") se escribe al estado
        // editable, y se rehabilita el CTA si estaba deshabilitado.
        actualizarDisponibilidadAplicar(false);

        estadoEditable().precioMin = numMin;
        estadoEditable().precioMax = numMax;

        if (modoDraftActivo()) {
            actualizarPreviewMobile();
            actualizarEstadoBotonLimpiar();
        } else {
            aplicarFiltrosYOrden();
        }
    }

    if (inputMin) inputMin.addEventListener("input", sincronizarPrecio);
    if (inputMax) inputMax.addEventListener("input", sincronizarPrecio);

    // 🔥 Ajuste UX (corrección post-candidato §7): "Limpiar filtros" del
    // drawer/sidebar — en desktop (o drawer cerrado) sigue exactamente la
    // lógica original (limpiarFiltros(): resetea todo y aplica de
    // inmediato, spec previo "no modificar la lógica actual de limpiar").
    // En mobile con el drawer abierto, limpia SOLO categoría/stock/precio
    // del draft — nunca busqueda/orden (fuera del alcance del drawer) — y
    // nunca cierra ni aplica: el usuario sigue confirmando con
    // "Ver N productos".
    function manejarClickLimpiar() {
        if (filtrosDraft) {
            filtrosDraft.categoria = "todos";
            filtrosDraft.enExistencia = false;
            filtrosDraft.precioMin = null;
            filtrosDraft.precioMax = null;

            if (checkExistencia) checkExistencia.checked = false;
            if (inputMin) inputMin.value = "";
            if (inputMax) inputMax.value = "";
            limpiarErrorPrecio(); // también borra cualquier error de precio visible (§23/§24)
            actualizarDisponibilidadAplicar(false); // precio vacío = siempre válido: rehabilita el CTA si estaba deshabilitado

            renderCategorias(categoriasReales); // refleja el draft ya limpio
            actualizarPreviewMobile();
            actualizarEstadoBotonLimpiar();
        } else {
            limpiarFiltros(categoriasReales);
        }
    }

    if (botonLimpiar) {
        botonLimpiar.addEventListener("click", manejarClickLimpiar);
    }
    if (botonLimpiarVacio) {
        // Siempre atado a lo APLICADO (solo existe cuando el resultado
        // real ya está vacío) — nunca pasa por el draft.
        botonLimpiarVacio.addEventListener("click", () => limpiarFiltros(categoriasReales));
    }

    aplicarFiltrosYOrden();
});
