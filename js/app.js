let categoriaActual = "all";

document.addEventListener("DOMContentLoaded", () => {
    renderProductos();
    activarFiltros();

    // 🔥 NUEVO: inicializar carrito
    actualizarContador();
    renderCarrito();
});

/* 🔥 CREAR CARD */
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

    // 🔥 EVENTO AGREGAR
    const btn = card.querySelector(".product-card__btn");

    btn.addEventListener("click", () => {
        agregarAlCarrito(producto);
    });

    return card;
}

/* 🔥 RENDER PRODUCTOS */
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

/* 🔥 FILTROS */
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

/* 🔥 CARRITO PANEL */
const btnCart = document.querySelector(".btn-cart");
const panel = document.getElementById("cart-panel");
const closeCart = document.getElementById("close-cart");

if (btnCart && panel && closeCart) {

    btnCart.addEventListener("click", () => {
        panel.classList.add("active");
        renderCarrito(); // 🔥 refresca siempre
    });

    closeCart.addEventListener("click", () => {
        panel.classList.remove("active");
    });
}