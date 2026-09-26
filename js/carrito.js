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
/* Punto común de la acción "agregar al carrito", usado tanto desde   */
/* la card del producto como desde el modal (Feature 02.1). El        */
/* parámetro "boton" es opcional: si se recibe, ese botón también     */
/* recibe el feedback visual temporal (AGREGADO ✓). El toast se       */
/* dispara siempre, sin importar el origen.                           */
function agregarAlCarrito(producto, boton) {
    const existe = carrito.find(p => p.id === producto.id);

    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    guardarCarrito();
    actualizarContador();
    renderCarrito();

    mostrarToast(producto.nombre);
    if (boton) marcarBotonComoAgregado(boton);
}

/* 🔥 TOAST DE FEEDBACK — un único toast reutilizado. Si el usuario   */
/* agrega varios productos rápido, se actualiza el texto y se         */
/* reinicia el temporizador en vez de apilar notificaciones.          */
let toastTimeoutId = null;

function mostrarToast(nombreProducto) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.innerHTML = `
        <strong>${nombreProducto} se agregó al carrito</strong>
        <span>Ya puedes seguir comprando.</span>
    `;

    toast.classList.add("toast--visible");

    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => {
        toast.classList.remove("toast--visible");
        toastTimeoutId = null;
    }, 2500);
}

/* 🔥 FEEDBACK TEMPORAL DEL BOTÓN (AGREGAR → AGREGADO ✓ → AGREGAR).   */
/* No deshabilita el botón: solo cambia texto/clase por ~1.2s.        */
/* Si se hace clic varias veces seguidas, reinicia su propio          */
/* temporizador en vez de dejar timers superpuestos.                  */
function marcarBotonComoAgregado(boton) {
    boton.textContent = "AGREGADO ✓";
    boton.classList.add("agregado");

    if (boton._feedbackTimeoutId) clearTimeout(boton._feedbackTimeoutId);
    boton._feedbackTimeoutId = setTimeout(() => {
        boton.textContent = "AGREGAR";
        boton.classList.remove("agregado");
        boton._feedbackTimeoutId = null;
    }, 1200);
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
                <button data-action="restar" data-id="${prod.id}">-</button>
                <span>${prod.cantidad}</span>
                <button data-action="sumar" data-id="${prod.id}">+</button>
                <button data-action="eliminar" data-id="${prod.id}">🗑</button>
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

/* 🔥 DELEGACIÓN DE EVENTOS (sumar/restar/eliminar) */
/* Un único listener sobre el contenedor estable #cart-items.       */
/* No se registra en cada renderCarrito(): el contenedor ya existe  */
/* en el DOM antes de este script (script al final del body).       */
const contenedorCarrito = document.getElementById("cart-items");

if (contenedorCarrito) {
    contenedorCarrito.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;

        const id = Number(btn.dataset.id);
        const accion = btn.dataset.action;

        if (accion === "sumar") sumar(id);
        else if (accion === "restar") restar(id);
        else if (accion === "eliminar") eliminar(id);
    });
}

/* La inicialización (actualizarContador/renderCarrito) queda a cargo   */
/* del DOMContentLoaded de app.js, que ya la ejecuta. Se elimina aquí   */
/* la inicialización duplicada que existía en este archivo.            */