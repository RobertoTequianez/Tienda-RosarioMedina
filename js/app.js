let categoriaActual = "all";

// PRODUCTO SELECCIONADO
let productoSeleccionado = null;

// CARRUSEL
let imagenActual = 0;
let listaImagenes = [];

// MODAL
let modal;
let modalImg;
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
    modalImg = document.getElementById("modal-image");
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

            imagenActual--;
            if (imagenActual < 0) {
                imagenActual = listaImagenes.length - 1;
            }

            modalImg.src = listaImagenes[imagenActual];
        });

        btnRight.addEventListener("click", (e) => {
            e.stopPropagation();

            imagenActual++;
            if (imagenActual >= listaImagenes.length) {
                imagenActual = 0;
            }

            modalImg.src = listaImagenes[imagenActual];
        });
    }

    if (modalBtn) {
        modalBtn.addEventListener("click", () => {
            if (productoSeleccionado) {
                agregarAlCarrito(productoSeleccionado);
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
        agregarAlCarrito(producto);
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

    modalImg.src = listaImagenes[imagenActual];

    modalTitle.textContent = producto.nombre;
    modalPrice.textContent = `$${producto.precio}`;
    modalDesc.textContent = producto.descripcion || "Producto premium.";
}

/* FLECHAS CARRUSEL */
// event binding moved to DOMContentLoaded to guarantee the modal elements exist

/* BOTÓN AGREGAR DESDE MODAL */
// event binding moved to DOMContentLoaded to guarantee the modal elements exist

/* CERRAR MODAL */
// event binding moved to DOMContentLoaded to guarantee the modal elements exist


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
