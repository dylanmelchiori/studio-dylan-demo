# Studio Dylan — web y panel de demostración

Esta es la copia de trabajo de la web estática preparada para Render. Incluye la página pública y un panel de demostración para mostrarle al cliente cómo podría administrar el estudio. No necesita instalar dependencias ni compilar.

## Ver en esta computadora

Desde esta carpeta, ejecutar:

```bash
python3 -m http.server 4174 --bind 127.0.0.1 --directory dist
```

- Página pública: http://127.0.0.1:4174/
- Espacio del cliente: http://127.0.0.1:4174/customer.html
- Panel: http://127.0.0.1:4174/admin.html

Usar un servidor local o Render para compartir el mismo almacenamiento entre la página y el panel. La persistencia de archivos abiertos directamente con doble clic depende del navegador.

## Qué permite el panel

- Ver la agenda por fecha y filtrar por estado.
- Agregar un turno manual con cliente, servicio, horario y notas.
- Marcar turnos como atendidos o cancelarlos con confirmación.
- Ver un dashboard ilustrativo de clientes: indicadores, visitas y servicios preferidos.
- Filtrar el directorio por nombre o teléfono, segmento, servicio y orden, y abrir la ficha de un cliente.
- Los perfiles ilustrativos se combinan con las altas de prueba de la agenda.
- Editar nombre, descripción, precio y duración de los tres servicios existentes.
- En Servicios y web → Página web, probar cambios de portada, presentación, imágenes y contacto con vista previa.
- Cambiar las fotos de portada y perfil desde archivos JPG, PNG o WebP; se optimizan para la demostración local.
- Ver el diseño de suscripción al calendario, con recorridos para iPhone y Google Calendar y estado pendiente de conexión.
- Como alternativa manual, añadir un turno de prueba a Google Calendar o descargarlo en formato .ics.
- Exportar los turnos confirmados de la fecha seleccionada en un archivo .ics.
- Recorrer el diseño de recordatorios por WhatsApp: reglas de ejemplo, editor de mensajes, vista previa en celular y simulación local.
- Restablecer los datos de ejemplo con confirmación.

## Recorrido del cliente

La reserva empieza con un acceso de demostración por nombre y WhatsApp. El perfil se recuerda en este navegador; nombre y teléfono se completan solos, y el último servicio reservado queda como opción inicial. También se puede elegir un servicio habitual desde **Mi espacio → Tus datos**. El servicio se elige antes del día para mostrar disponibilidad compatible con su duración.

Al confirmar se abre **Mi espacio**, con el próximo turno, fecha, hora de Argentina, servicio, duración, precio al reservar, dirección, historial y opciones de calendario. Solo se muestran los turnos vinculados al perfil de demostración actual. Los cambios de estado desde el panel se reflejan en el espacio del cliente. Cerrar sesión permite probar otro perfil; volver a ingresar con el mismo WhatsApp recupera sus turnos en ese navegador.

El acceso no usa contraseña ni verifica la identidad: es una propuesta de interfaz y no una autenticación de producción. Usar datos ficticios. Los perfiles y sus preferencias se guardan con la clave `studio-dylan-customer-v1`, separados de los datos del estudio. El perfil se puede editar sin modificar los datos históricos de un turno ya reservado.

En **Recordatorios**, el permiso de notificaciones se pide únicamente al tocar el botón. Un navegador compatible puede mostrar una notificación local de prueba mediante el service worker; se informa si el permiso está bloqueado o no está disponible. El permiso es del navegador y cerrar sesión o desactivar la preferencia no lo revoca. La opción de WhatsApp guarda una preferencia y está identificada como pendiente de conexión. Los recordatorios automáticos, Web Push remoto y el envío de WhatsApp requieren conectar servicios adicionales.

Si el almacenamiento está bloqueado o lleno, la confirmación permanece en la página de reserva para no perder los datos al navegar. El resumen y la exportación al calendario pueden probarse durante esa sesión.

Las pruebas de integración del recorrido local se ejecutan desde esta carpeta con `node --test tests/customer-flow.test.cjs`. No requieren instalar dependencias.

Los indicadores y gráficos de Clientes usan perfiles y series ilustrativas, identificados en la interfaz. No representan estadísticas reales del negocio. Los filtros y las fichas son interacciones de demostración.

La reserva de prueba de la página pública aparece en el panel, y el enlace de la confirmación abre la fecha reservada. Los cambios de servicios, textos, imágenes y contacto guardados se ven también en la página pública del mismo navegador. El editor permite revisar un borrador antes de guardar; guardar la prueba no publica cambios para otros visitantes. Los turnos ya creados conservan el servicio y la duración que tenían al reservar.

El estudio atiende de martes a sábado, de 09 a 13 y de 15 a 19. Solo se ofrecen horarios en los que cabe la duración completa del servicio; se controlan los solapamientos. Los turnos cancelados liberan el horario y los atendidos conservan su lugar en el historial. La demo permite probar horarios del mismo día aunque ya hayan pasado.

La interfaz se adapta a PC e iPhone: navegación superior en pantallas chicas, formularios con controles cómodos y sin dependencias de acciones al pasar el mouse. Se comprobó el diseño en navegador de escritorio y a 390 px de ancho; queda pendiente la prueba en un iPhone físico con Safari.

En la página pública, los accesos fijos de reserva se ocultan al desplazarse hacia abajo y vuelven al subir. Al inicio de la página permanecen visibles.

## Calendario: diseño de suscripción y exportación manual

El botón de suscripción muestra una propuesta de recorrido; todavía no crea un enlace de suscripción, no conecta cuentas y no sincroniza calendarios. Se presenta una futura suscripción de solo lectura, desde la agenda de la web hacia el calendario del profesional. Los cambios se gestionarían desde la web. La actualización dependería de cuándo el calendario vuelva a consultar el enlace.

Para activar esa suscripción más adelante, la agenda necesita almacenamiento compartido y un enlace privado que sirva los turnos actualizados. La demostración actual guarda datos en cada navegador y no ofrece ese servicio. Editar desde ambos lados requeriría una integración adicional.

Las opciones manuales son independientes del diseño de suscripción: en la confirmación pública y en los turnos confirmados del panel se puede abrir un borrador en Google Calendar o descargar un archivo .ics. No se guarda ningún evento sin intervención del usuario. Los archivos y títulos dicen PRUEBA y omiten teléfonos y notas; los eventos del profesional incluyen el nombre del cliente. Los archivos respetan fecha, hora de Argentina y duración del turno.

Importar un archivo no activa sincronización: cancelar o cambiar un turno en la web no modifica un evento ya importado. El flujo de abrir o importar .ics depende del dispositivo y queda pendiente verificarlo en un iPhone físico.

## WhatsApp: recordatorios en vista de demostración

La pestaña WhatsApp muestra una propuesta visual con tres momentos de ejemplo: confirmación de reserva, un día antes y dos horas antes. Se pueden probar los interruptores, elegir el tipo de mensaje, editar una plantilla con variables y ver cómo quedaría el texto en un celular.

La configuración y los mensajes de esta vista se mantienen solo durante la sesión de la página; no se guardan como reglas reales. Guardar o simular solo cambia la presentación del prototipo. El recorrido de conexión es informativo: no conecta una cuenta, no muestra un QR real, no abre WhatsApp ni envía mensajes. Los recordatorios de la lista se identifican como ejemplos simulados.

## Alcance de esta demostración

Usar datos ficticios. El panel es público y no tiene autenticación. No crea reservas reales, no envía WhatsApp y no se conecta a una agenda real.

Turnos, servicios y contenido de la página se guardan en localStorage bajo `studio-dylan-demo-v1`, solo en este navegador y esta dirección. No se comparten con otros dispositivos o visitantes. Al borrar los datos del navegador se pierde la prueba. Si el navegador bloquea el almacenamiento se informa en pantalla y se puede probar durante la sesión.

## Actualizar la versión en Render

El paquete conserva la estructura existente: `dist/`, `render.yaml` y este archivo. Para actualizar el sitio actual, reemplazar en su repositorio el contenido de `dist/` por el de esta carpeta. Mantener la configuración existente de publicación estática con directorio `dist`.

El panel está en `/admin.html` y el espacio del cliente en `/customer.html`. El repositorio de publicación es [dylanmelchiori/studio-dylan-demo](https://github.com/dylanmelchiori/studio-dylan-demo), en la rama `main`. Al subir una actualización, Render publica la carpeta `dist` si el despliegue automático está habilitado.

## Archivos

- `dist/index.html` y `dist/app.js`: página pública y recorrido de reserva.
- `dist/admin.html`, `dist/admin.css`, `dist/admin.js`: panel de demostración.
- `dist/demo-store.js`: datos de ejemplo, almacenamiento y reglas compartidas.
- `dist/clients-panel.js` y `.css`: dashboard, filtros y fichas de clientes.
- `dist/content-editor.js` y `.css`: editor gráfico de la página y vista previa.
- `dist/content.js`: textos, marca y servicios iniciales.
- `dist/customer.html`, `dist/customer.css` y `dist/customer.js`: espacio personal del cliente, turnos, perfil y recordatorios.
- `dist/customer-store.js`: perfiles de demostración, sesión local y preferencias.
- `dist/customer-auth.js` y `.css`: acceso compartido y autocompletado de la reserva.
- `dist/customer-sw.js`: notificación local de prueba, sin caché ni recordatorios programados.
- `dist/calendar-panel.js` y `.css`: diseño de suscripción y opciones manuales de calendario.
- `dist/calendar-files.js`: enlaces de borrador Google Calendar y archivos iCalendar sin dependencias.
- `dist/reminders-panel.js` y `.css`: diseño y simulación visual de recordatorios por WhatsApp.

La copia anterior y el proyecto original de Dylan permanecen intactos. Los cambios siguientes se trabajan en esta carpeta `studio-dylan-demo`.
