'use strict';

/**
 * ETAPAS DE VIDA QUE ACOMPAÑA LA EMPRESA
 * ======================================
 *
 * Es el diferenciador central del proyecto: el resto del sector se detiene en
 * la menstruación, y aquí se cubren las cinco etapas.
 *
 * DÓNDE SE USA CADA CAMPO
 *   id             → ancla de la URL (/servicios#embarazo) y valor del
 *                    desplegable del formulario de contacto
 *   orden          → el número decorativo "01", "02"... en la portada
 *   nombre         → título visible
 *   resumen        → frase corta de la lista de la portada
 *   descripcion    → párrafo completo del panel de /servicios
 *   acompanamiento → los 3 puntos con palomita de cada panel
 *
 * Este mismo array se convierte en texto y se envía a Aura, para que el chat
 * conozca exactamente las mismas etapas que muestra la web.
 *
 * Base documental: "¿A quién afecta?" y "¿Qué haremos diferente?" (Fase 1).
 */

const etapas = [
  {
    id: 'pubertad',
    orden: '01',
    nombre: 'Pubertad',
    resumen: 'Los primeros cambios, explicados sin rodeos y sin vergüenza.',
    descripcion:
      'Acompañamos a las adolescentes en la llegada de la menarquia y en los cambios del cuerpo con información clara, verificada y a su altura. Diarios personalizados para registrar lo que sienten y material educativo pensado para su edad.',
    acompanamiento: ['Guías educativas por edad', 'Diario personalizado juvenil', 'Resolución de dudas sin juicio'],
  },
  {
    id: 'menstruacion',
    orden: '02',
    nombre: 'Menstruación',
    resumen: 'Del dolor que se normaliza a un cuidado que sí responde.',
    descripcion:
      'Orientación sobre el ciclo, señales que merecen consulta médica y alternativas de alivio físico. Productos de bienestar seleccionados para los días de mayor molestia, sin promesas milagrosas.',
    acompanamiento: ['Alivio físico con productos naturales', 'Registro y lectura del ciclo', 'Señales de alerta a consultar'],
  },
  {
    id: 'embarazo',
    orden: '03',
    nombre: 'Embarazo',
    resumen: 'Información confiable en la etapa donde más sobra el ruido.',
    descripcion:
      'Contenido educativo revisado, directorio de profesionales cercanos y una comunidad donde otras mujeres cuentan lo que vivieron. El acompañamiento emocional pesa tanto como el físico.',
    acompanamiento: ['Directorio de profesionales', 'Comunidad de apoyo moderada', 'Cuidado del bienestar emocional'],
  },
  {
    id: 'menopausia',
    orden: '04',
    nombre: 'Menopausia',
    resumen: 'Una etapa larga que casi nadie explica bien.',
    descripcion:
      'Orientación sobre los cambios hormonales, su efecto en el ánimo y el descanso, y productos de confort. Rompemos el silencio alrededor de una etapa que atraviesa a todas.',
    acompanamiento: ['Educación con base científica', 'Productos de confort', 'Espacios de conversación'],
  },
  {
    id: 'procesos-medicos',
    orden: '05',
    nombre: 'Procesos médicos',
    resumen: 'Antes, durante y después de un procedimiento.',
    descripcion:
      'Acompañamiento a mujeres que atraviesan procesos como una histerectomía: qué esperar, cómo cuidarse en la recuperación y dónde apoyarse emocionalmente cuando el entorno no sabe cómo ayudar.',
    acompanamiento: ['Preparación y recuperación', 'Apoyo emocional dirigido', 'Conexión con especialistas'],
  },
];

module.exports = { etapas };
