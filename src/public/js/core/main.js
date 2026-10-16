/**
 * PUNTO DE ENTRADA DEL JAVASCRIPT COMPARTIDO
 * ==========================================
 *
 * Se carga en todas las páginas y arranca solo el comportamiento común.
 * Lo específico de cada vista vive en `/js/views/*.js`, y el controlador lo
 * añade únicamente donde hace falta: la página de contacto no descarga el
 * código de las pestañas de servicios, ni al revés.
 *
 * MÓDULOS ES
 * Se carga con `<script type="module">`, lo que permite usar `import`. Los
 * módulos son diferidos por defecto: el navegador no los ejecuta hasta tener
 * el HTML completo, así que al llegar aquí todos los elementos existen.
 */

// Cada import trae una función que arranca una parte del sitio. Están
// separadas por responsabilidad, no todas revueltas en este archivo.
import { iniciarRevelado } from './reveal.js'; //        Animaciones al hacer scroll
import { iniciarNavegacion } from './nav.js'; //         Cabecera y menú móvil
import { iniciarChat } from '../components/chat.js'; //  Widget de Aura
import { iniciarCarrito } from '../components/carrito.js'; // Bolsa y pedido por WhatsApp

/**
 * Arranca los tres módulos.
 *
 * Cada función comprueba por su cuenta si los elementos que necesita existen
 * en la página. Por eso se pueden llamar siempre las tres, aunque el chat no
 * esté presente (login, páginas de error): simplemente no hacen nada.
 */
function iniciar() {
  iniciarNavegacion();
  iniciarRevelado();
  iniciarChat();
  iniciarCarrito();
}

// Los módulos ya se ejecutan con el DOM listo, pero se comprueba igual: si
// alguien cambiara la etiqueta a un `<script>` normal, esto seguiría
// funcionando en lugar de fallar en silencio.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar, { once: true });
} else {
  iniciar();
}
