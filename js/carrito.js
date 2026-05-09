let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

/* 🔥 CONFIG ENVÍO */
const CONFIG_ENVIO = {
    costo: 150,
    gratisDesde: 2000,
};

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

        const subtotal = Number(prod.precio) * prod.cantidad;

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
                <button onclick="restar(${prod.id})">-</button>
                <span>${prod.cantidad}</span>
                <button onclick="sumar(${prod.id})">+</button>
                <button onclick="eliminar(${prod.id})">🗑</button>
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

/* 🔥 INICIALIZAR */
document.addEventListener("DOMContentLoaded", () => {
    actualizarContador();
    renderCarrito();
});