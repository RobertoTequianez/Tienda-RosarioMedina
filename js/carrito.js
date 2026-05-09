let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

function actualizarContador() {
    const contador = document.getElementById("cart-count");
    if (!contador) return;

    const total = carrito.reduce((acc, p) => acc + p.cantidad, 0);
    contador.textContent = total;
}

/* 🔥 CALCULAR TOTAL */
function calcularTotal() {
    return carrito.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
}

/* 🔥 AGREGAR PRODUCTO */
function agregarAlCarrito(producto) {
    const existe = carrito.find(p => p.id === producto.id);

    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    guardarCarrito();
    actualizarContador();
    renderCarrito();
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

        item.innerHTML = `
            <div>
                <strong>${prod.nombre}</strong>
                <p>$${prod.precio}</p>
            </div>

            <div>
                <button onclick="restar(${prod.id})">-</button>
                <span>${prod.cantidad}</span>
                <button onclick="sumar(${prod.id})">+</button>
                <button onclick="eliminar(${prod.id})">🗑</button>
            </div>
        `;

        contenedor.appendChild(item);
    });

    /* 🔥 ACTUALIZAR TOTAL */
    if (totalContainer) {
        totalContainer.textContent = calcularTotal();
    }
}

/* 🔥 CONTROLES */
function sumar(id) {
    const prod = carrito.find(p => p.id === id);
    if (!prod) return;

    prod.cantidad++;
    guardarCarrito();
    renderCarrito();
    actualizarContador();
}

function restar(id) {
    const prod = carrito.find(p => p.id === id);
    if (!prod) return;

    prod.cantidad--;

    if (prod.cantidad <= 0) {
        carrito = carrito.filter(p => p.id !== id);
    }

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