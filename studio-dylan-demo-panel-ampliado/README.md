# Studio Dylan — web y panel de demostración

Esta es la copia de trabajo de la web estática preparada para Render. Incluye la página pública y un panel básico para mostrarle al cliente cómo podría administrar el estudio. No necesita instalar dependencias ni compilar.

## Ver en esta computadora

Desde esta carpeta, ejecutar:

```bash
python3 -m http.server 4174 --bind 127.0.0.1 --directory dist
```

- Página pública: http://127.0.0.1:4174/
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
- Restablecer los datos de ejemplo con confirmación.

Los indicadores y gráficos de Clientes usan perfiles y series ilustrativas, identificados en la interfaz. No representan estadísticas reales del negocio. Los filtros y las fichas son interacciones de demostración.

La reserva de prueba de la página pública aparece en el panel, y el enlace de la confirmación abre la fecha reservada. Los cambios de servicios, textos, imágenes y contacto guardados se ven también en la página pública del mismo navegador. El editor permite revisar un borrador antes de guardar; guardar la prueba no publica cambios para otros visitantes. Los turnos ya creados conservan el servicio y la duración que tenían al reservar.

El estudio atiende de martes a sábado, de 09 a 13 y de 15 a 19. Solo se ofrecen horarios en los que cabe la duración completa del servicio; se controlan los solapamientos. Los turnos cancelados liberan el horario y los atendidos conservan su lugar en el historial. La demo permite probar horarios del mismo día aunque ya hayan pasado.

La interfaz se adapta a PC e iPhone: navegación superior en pantallas chicas, formularios con controles cómodos y sin dependencias de acciones al pasar el mouse. Se comprobó el diseño en navegador de escritorio y a 390 px de ancho; queda pendiente la prueba en un iPhone físico con Safari.

En la página pública, los accesos fijos de reserva se ocultan al desplazarse hacia abajo y vuelven al subir. Al inicio de la página permanecen visibles.

## Alcance de esta demostración

Usar datos ficticios. El panel es público y no tiene autenticación. No crea reservas reales, no envía WhatsApp y no se conecta a una agenda real.

Turnos, servicios y contenido de la página se guardan en localStorage bajo `studio-dylan-demo-v1`, solo en este navegador y esta dirección. No se comparten con otros dispositivos o visitantes. Al borrar los datos del navegador se pierde la prueba. Si el navegador bloquea el almacenamiento se informa en pantalla y se puede probar durante la sesión.

## Actualizar la versión en Render

El paquete conserva la estructura existente: `dist/`, `render.yaml` y este archivo. Para actualizar el sitio actual, reemplazar en su repositorio el contenido de `dist/` por el de esta carpeta. Mantener la configuración existente de publicación estática con directorio `dist`.

El panel quedará en `/admin.html`, y la web incluye enlaces para abrirlo. Esta entrega no modifica GitHub ni la publicación actual de Render.

## Archivos

- `dist/index.html` y `dist/app.js`: página pública y recorrido de reserva.
- `dist/admin.html`, `dist/admin.css`, `dist/admin.js`: panel de demostración.
- `dist/demo-store.js`: datos de ejemplo, almacenamiento y reglas compartidas.
- `dist/clients-panel.js` y `.css`: dashboard, filtros y fichas de clientes.
- `dist/content-editor.js` y `.css`: editor gráfico de la página y vista previa.
- `dist/content.js`: textos, marca y servicios iniciales.

La copia anterior y el proyecto original de Dylan permanecen intactos. Los cambios siguientes se trabajan en esta carpeta `studio-dylan-demo`.
