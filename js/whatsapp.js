/* 🔥 Feature 06 — BOTÓN FLOTANTE DE WHATSAPP
   ==================================================================
   Este archivo controla EXCLUSIVAMENTE el botón flotante de contacto
   general (.whatsapp-btn, esquina inferior derecha). No debe confundirse
   con WHATSAPP_NUMERO/construirMensajeWhatsApp/generarLinkWhatsApp en
   js/carrito.js: esa es una preparación previa y separada, pensada para
   mensajes contextuales de stock/límite de compra dentro del carrito
   (todavía sin usar), no para este botón general del header.

   Auditoría (antes de este archivo): el botón .whatsapp-btn existía
   visualmente (círculo verde con emoji 💬) pero sin ningún href ni
   funcionalidad — un clic no hacía nada. Este mismo archivo
   (js/whatsapp.js) ya estaba referenciado como "esperado" para la
   feature pero existía vacío y ni siquiera estaba enlazado desde
   index.html. No había número configurado en ningún lugar del código
   para este botón específico. */

/* Configuración centralizada. Si Roberto no ha proporcionado todavía un
   número real de Tienda Rosario, NO se inventa uno ni se commitea un
   número de prueba: queda en null a propósito. */
const WHATSAPP_CONFIG = {
    numero: null, // TODO (Feature 06): configurar número real — código de país + dígitos, sin "+", sin espacios, sin guiones (ej. "5215512345678")
    mensaje: "Hola, tengo una consulta sobre Tienda Rosario.",
};

/* Genera el enlace oficial de WhatsApp solo si hay un número real y con
   forma válida (código de país + dígitos, sin "+"/espacios/guiones). No
   hace normalización destructiva (no intenta "adivinar" ni reparar un
   número mal escrito) — si no cumple el formato esperado, simplemente no
   genera enlace, para nunca producir un enlace roto. */
function generarEnlaceWhatsAppContacto() {
    const numero = WHATSAPP_CONFIG.numero;
    if (!numero) return null;

    const formatoValido = /^[1-9]\d{6,14}$/.test(numero);
    if (!formatoValido) return null;

    return `https://wa.me/${numero}?text=${encodeURIComponent(WHATSAPP_CONFIG.mensaje)}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const boton = document.querySelector(".whatsapp-btn");
    if (!boton) return;

    const enlace = generarEnlaceWhatsAppContacto();

    if (!enlace) {
        // 🔥 Sin número real configurado: el botón permanece oculto
        // (atributo `hidden`, ya presente por defecto en index.html) y
        // por lo tanto fuera del tab order — nunca se muestra un enlace
        // roto ni un mensaje técnico ("WHATSAPP_NUMERO=null" o similar)
        // en pantalla. No hace falta hacer nada más aquí; se documenta
        // explícitamente para que quede claro que es una decisión, no un
        // olvido.
        return;
    }

    boton.href = enlace;
    boton.hidden = false;
});
