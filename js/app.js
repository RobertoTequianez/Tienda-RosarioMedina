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

// FLECHAS
let btnLeft;
let btnRight;

document.addEventListener("DOMContentLoaded", () => {
    modal = document.getElementById("product-modal");
    modalTrack = document.getElementById("modal-track");
    modalTitle = document.getElementById("modal-title");
    modalPrice = document.getElementById("modal-price");
    modalDesc = document.getElementById("modal-description");
    closeModal = document.getElementById("close-modal");
    modalBtn = document.getElementById("modal-add");
    btnLeft = document.querySelector(".modal__arrow--left");
    btnRight = document.querySelector(".modal__arrow--right");

    if (btnLeft && btnRight) {
        btnLeft.addEventListener("click", (e) => {
            e.stopPropagation();
            if (listaImagenes.length <= 1) return;

            imagenActual = (imagenActual - 1 + listaImagenes.length) % listaImagenes.length;
            desplazarCarruselA(imagenActual);
        });

        btnRight.addEventListener("click", (e) => {
            e.stopPropagation();
            if (listaImagenes.length <= 1) return;

            imagenActual = (imagenActual + 1) % listaImagenes.length;
            desplazarCarruselA(imagenActual);
        });
    }

    // Mantiene imagenActual sincronizado cuando el usuario desliza
    // el carrusel manualmente (swipe táctil / scroll con mouse),
    // para que las flechas sigan navegando desde la imagen correcta.
    if (modalTrack) {
        modalTrack.addEventListener("scroll", () => {
            const ancho = modalTrack.clientWidth;
            if (!ancho || listaImagenes.length <= 1) return;

            imagenActual = Math.round(modalTrack.scrollLeft / ancho);
        });
    }

    if (modalBtn) {
        modalBtn.addEventListener("click", () => {
            if (productoSeleccionado) {
                agregarAlCarrito(productoSeleccionado, modalBtn);
                modal.classList.remove("active");
            }
        });
    }

    if (closeModal) {
        closeModal.addEventListener("click", () => {
            modal.classList.remove("active");
        });

        window.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("active");
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

    card.innerHTML = `
        <div class="product-card__image">
            <img src="${producto.imagen}" alt="${producto.nombre}">
        </div>

        <div class="product-card__info">
            <h3 class="product-card__title">${producto.nombre}</h3>
            <p class="product-card__price">$${producto.precio}</p>

            <button class="product-card__btn">AGREGAR</button>
        </div>
    `;

    const btn = card.querySelector(".product-card__btn");

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        agregarAlCarrito(producto, btn);
    });

    card.addEventListener("click", () => {
        abrirModal(producto);
    });

    return card;
}

/* MODAL */
function abrirModal(producto) {
    modal.classList.add("active");

    productoSeleccionado = producto;

    // CARRUSEL
    listaImagenes = producto.imagenes || [producto.imagen];
    imagenActual = 0;

    renderCarruselModal(producto.nombre);

    modalTitle.textContent = producto.nombre;
    modalPrice.textContent = `$${producto.precio}`;
    modalDesc.textContent = producto.descripcion || "Producto premium.";
}

/* CARRUSEL DEL MODAL (DOM real con scroll-snap, no reemplazo de src) */
/* Las imágenes viven dentro de .modal__track (único elemento que   */
/* hace scroll). Las flechas son hermanas del track, position:absolute */
/* respecto a .modal__image, y por eso permanecen fijas visualmente */
/* sin importar cuál imagen esté visible.                            */
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
    actualizarVisibilidadFlechas();
}

function actualizarVisibilidadFlechas() {
    const hayVariasImagenes = listaImagenes.length > 1;

    if (btnLeft) btnLeft.style.display = hayVariasImagenes ? "flex" : "none";
    if (btnRight) btnRight.style.display = hayVariasImagenes ? "flex" : "none";
}

function desplazarCarruselA(indice) {
    if (!modalTrack) return;

    const ancho = modalTrack.clientWidth;
    modalTrack.scrollTo({ left: ancho * indice, behavior: "smooth" });
}

/* BOTÓN AGREGAR DESDE MODAL */
// event binding en DOMContentLoaded (arriba)

/* CERRAR MODAL */
// event binding en DOMContentLoaded (arriba)


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
