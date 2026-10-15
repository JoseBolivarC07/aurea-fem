'use strict';

/**
 * SERVICIOS DE LA PLATAFORMA
 * ==========================
 *
 * Este archivo exporta TRES conjuntos de datos distintos, todos relacionados
 * con lo que ofrece la empresa:
 *
 *   1. `servicios`        → los 6 servicios de la plataforma
 *   2. `pilares`          → los 4 compromisos de marca (portada)
 *   3. `diferenciadores`  → la tabla comparativa frente al sector
 *
 * Base documental: "¿Qué haremos diferente?" e "Innovación del servicio"
 * (Fase 1 del proyecto).
 */

// ── BLOQUE 1: Servicios de la plataforma ────────────────────────────────────
/**
 * El campo `icono` guarda el nombre de un símbolo del sprite SVG
 * (`partials/icons.ejs`). En la plantilla se usa así:
 *     <use href="#i-<%= servicio.icono %>">
 * De modo que `icono: 'mapa'` apunta al símbolo `#i-mapa`.
 *
 * El campo `destacado` decide qué aparece en la PORTADA: allí se muestran
 * solo los 4 marcados como true, mientras que /servicios los muestra todos.
 */
const servicios = [
  {
    id: 'geolocalizacion',
    icono: 'mapa',
    nombre: 'Geolocalización de centros de salud',
    resumen: 'Encuentra el centro de salud o la profesional más cercana sin perder una tarde buscando.',
    detalle:
      'Un mapa con centros de salud, consultorios y profesionales aliadas ordenados por cercanía, con la información de contacto verificada.',
    destacado: true,
  },
  {
    id: 'chat-ia',
    icono: 'chat',
    nombre: 'Aura, orientadora con inteligencia artificial',
    resumen: 'Resuelve dudas sobre tu cuerpo a cualquier hora, en privado y sin sentirte juzgada.',
    detalle:
      'Una asistente entrenada exclusivamente en salud y bienestar femenino. Orienta y educa; nunca diagnostica ni receta, y siempre te dice cuándo conviene ver a una profesional.',
    destacado: true,
  },
  {
    id: 'foro',
    icono: 'comunidad',
    nombre: 'Foro seguro de apoyo femenino',
    resumen: 'Un espacio moderado donde lo que cuentas se queda entre mujeres que entienden.',
    detalle:
      'Comunidad con moderación activa y reglas claras de respeto. Nadie es juzgada por lo que vive, cree o decide.',
    destacado: true,
  },
  {
    id: 'productos',
    icono: 'hoja',
    nombre: 'Productos de alivio y bienestar',
    resumen: 'Kit menstrual, gel térmico, faja térmica y té rojo para los días difíciles.',
    detalle:
      'Cada producto pasa por revisión antes de llegar a ti: buscamos alivio real, no promesas de etiqueta.',
    destacado: true,
  },
  {
    id: 'diarios',
    icono: 'diario',
    nombre: 'Diarios personalizados',
    resumen: 'Para adolescentes y adultas: escribir también es una forma de cuidarse.',
    detalle:
      'Diarios diseñados por etapa, con espacios guiados para registrar el ciclo, el ánimo y lo que se quiera dejar por escrito.',
    destacado: false,
  },
  {
    id: 'directorio',
    icono: 'escudo',
    nombre: 'Directorio de profesionales',
    resumen: 'Ginecólogas y especialistas aliadas que respaldan lo que publicamos.',
    detalle:
      'Alianzas con profesionales de la salud y universidades que validan el contenido educativo de la plataforma.',
    destacado: false,
  },
];

// ── BLOQUE 2: Pilares de marca ──────────────────────────────────────────────
/**
 * Los cuatro compromisos que se muestran en tarjetas en la portada.
 *
 * No son servicios: son promesas de cómo se presta el servicio. Por eso van
 * en un array aparte aunque compartan la misma forma (icono, título, texto).
 */
const pilares = [
  {
    id: 'informacion',
    icono: 'brillo',
    titulo: 'Información confiable',
    texto: 'Contenido educativo con base científica y respaldo de profesionales de la salud.',
  },
  {
    id: 'acompanamiento',
    icono: 'corazon',
    titulo: 'Acompañamiento real',
    texto: 'Orientación y comunidad para las etapas donde más se necesita y menos se habla.',
  },
  {
    id: 'bienestar',
    icono: 'hoja',
    titulo: 'Alivio físico',
    texto: 'Productos de bienestar seleccionados y distribuidos con criterio, no por moda.',
  },
  {
    id: 'confidencialidad',
    icono: 'escudo',
    titulo: 'Espacio confidencial',
    texto: 'Lo que consultas en la plataforma es privado. La confidencialidad no se negocia.',
  },
];

// ── BLOQUE 3: Comparativa con el sector ─────────────────────────────────────
/**
 * Cada objeto es una FILA de la tabla comparativa de /servicios:
 *   `otros`    → columna izquierda, lo que hace el resto del sector
 *   `nosotras` → columna derecha, la propuesta de Áurea Fem
 *
 * Guardarlo emparejado (y no como dos listas sueltas) garantiza que cada
 * afirmación quede siempre frente a la suya, aunque se reordenen las filas.
 */
const diferenciadores = [
  {
    otros: 'Venden productos para la menstruación, y hasta ahí llega el acompañamiento.',
    nosotras: 'Cubrimos las cinco etapas: pubertad, menstruación, embarazo, menopausia y procesos médicos.',
  },
  {
    otros: 'Ofrecen una app de seguimiento del ciclo, desconectada de todo lo demás.',
    nosotras: 'Integramos orientación, comunidad y productos en una sola plataforma.',
  },
  {
    otros: 'Publican información general sin respaldo profesional visible.',
    nosotras: 'Trabajamos con ginecólogas y universidades aliadas que validan el contenido.',
  },
  {
    otros: 'Dejan el acompañamiento emocional por fuera del producto.',
    nosotras: 'El foro moderado y los diarios son parte del servicio, no un extra.',
  },
];

module.exports = { servicios, pilares, diferenciadores };
