/**
 * Marca el documento como "con JavaScript activo" antes de que se pinte nada.
 *
 * Las animaciones de entrada dejan los elementos ocultos hasta que se revelan;
 * si esa clase se aplicara después del primer pintado, el contenido aparecería
 * y desaparecería. Por eso este archivo se carga de forma bloqueante en <head>
 * y es lo único que hace.
 *
 * Efecto secundario deseado: si el navegador no ejecuta JavaScript, la clase
 * nunca se añade y la página se ve completa, sin animaciones.
 */
document.documentElement.classList.add('js-activo');
