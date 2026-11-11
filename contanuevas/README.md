# Contanuevas · edición de prueba

Versión pública: https://contanuevas.martinisanchez7.workers.dev/
Rama de publicación: contanuevas. Carpeta del repositorio: contanuevas.


Un boletín para leer novedades impositivas, contables y laborales de Argentina, más una sección internacional. La interfaz y la API JSON comparten el mismo catálogo. No hay cuentas de usuario, datos privados ni servicios de terceros en el navegador.

## Abrirlo en Windows

1. Descomprimí el paquete completo en una carpeta. Requiere Node.js 24 y no necesita instalar dependencias.
2. Ejecutá **Abrir Contanuevas.cmd**. Se abre la interfaz en el navegador al estar disponible el servidor local. Cerrá la ventana del servidor para apagarlo.
3. Si querés leer las fuentes de Internet, abrí PowerShell dentro de la carpeta y ejecutá `node --use-system-ca server.mjs --con-fuentes`. Abrí `http://127.0.0.1:4195/`. Usá un solo servidor a la vez. El proceso consulta al iniciar y cada 24 horas mientras siga abierto. Guarda las últimas fichas importadas en contanuevas-cache.json y las recupera al reiniciar, incluso si falla la siguiente consulta. Ejecutalo desde una carpeta con permiso de escritura. El modo archivo conserva únicamente las fichas históricas. Este modo no configura un servicio programado en Windows.
4. Para acceso directo de escritorio o barra, creá un acceso a `Abrir Contanuevas.cmd` y elegí **Cambiar icono** → `contanuevas.ico`. Se incluye un PNG cuadrado de 512 px para redes y un SVG para la pestaña.

## Qué se puede comprobar

- `npm.cmd test` ejecuta la comprobación de la API y las pruebas offline de fuentes. No requiere credenciales.
- Ficha revisada inicial: casas particulares de noviembre de 2026, con enlaces a Infoleg, al anexo rectificado y a ARCA. Usá el filtro `modo=editorial`.
- Archivo inicial: cinco referencias históricas reales en las cuatro secciones. La ficha RT 54 registra el mes de referencia del archivo fuente, no el día de adopción. Ninguna ficha histórica afirma vigencia actual.
- Modo con fuentes: Boletín Oficial, Primera Sección (HTML sujeto a cambios) y comunicados RSS de la Reserva Federal. El índice del Boletín se clasifica por términos y puede omitir avisos pertinentes; su cobertura no es exhaustiva. Las importaciones son fichas detectadas, sin revisión editorial.
- Infoleg, FACPCE y Errepar aportan referencias manuales. iProfesional, Perfil y Ámbito tienen consultas RSS de titulares y enlaces, cuyo estado se informa por separado. No se redistribuyen notas completas. ARCA, CNV, BCRA, BLS y BCE quedan en el catálogo manual hasta validar sus conexiones.
- La sección internacional contextualiza hechos; no produce recomendaciones, precios en tiempo real ni señales de compra o venta.

## API de solo lectura

Para iniciar el modo conectado desde Windows, ejecutá **Abrir con fuentes.cmd** y abrí la dirección que imprime. Los filtros del boletín quedan en la URL y se conservan al recargar. El contrato también está disponible en `/openapi.json`.

El contrato para importar en clientes de API está en `openapi.json`.

| Ruta | Respuesta |
| --- | --- |
| `GET /api/v1/novedades` | Listado con filtros por categoría, jurisdicción, perfil, fecha, prioridad, respaldo y fuente. Incluye paginación. |
| `GET /api/v1/novedades/{id}` | Ficha única o `404`. |
| `GET /api/v1/fuentes` | Catálogo con el rol de cada fuente. |
| `GET /api/v1/salud` | Modo, último intento, estado por fuente y total de fichas. |

Ejemplo: `http://127.0.0.1:4195/api/v1/novedades?categoria=contable&modo=archivo`. Las fechas exactas se consultan como `AAAA-MM-DD`; `datePrecision` permite distinguir fechas de referencia mensuales. Se devuelve `400` ante filtros inválidos. El cliente no puede pedir URLs de ingestión ni disparar una descarga remota.

Para ver novedades impositivas de CABA por prioridad, usá `?categoria=impositivo&jurisdiccion=caba&orden=relevantes`. Para auditoría local, usá `?jurisdiccion=caba&orden=perfil&perfil=auditoria`. Cada ficha puede tener más de un alcance. Las fichas de prensa sin alcance confirmado quedan pendientes de clasificación.

Los avisos en el Worker respetan la hora argentina, la sección, el alcance y el sector elegidos. Priorizan una ficha revisada o una síntesis oficial del día o del día anterior y enlazan a su detalle. Si el filtro queda sin coincidencias, el aviso indica que no hay fichas nuevas con resumen.

Antes de producción: almacenamiento compartido si hay más de una instancia, programación con alertas, revisión humana de fichas, prueba visual del alojamiento, permisos de fuentes comerciales y revisión de dominio/HTTPS. La publicación de Instagram queda para después de aprobar la primera edición.

## Configuración de alojamiento

### Cloudflare Workers Free

El repositorio de GitHub guarda el código. El boletín y la API corren juntos en un Worker independiente con su propia dirección `workers.dev`.

1. Con Node.js 24, ejecutá `npm test` y `node prepare-assets.mjs`. Para probar el empaquetado, ejecutá `npx wrangler@4 deploy --dry-run`.
2. En Cloudflare, elegí Workers & Pages y creá un Worker desde el repositorio GitHub de Contanuevas. Seleccioná el plan Free y autorizá solo el repositorio correspondiente. Configurá como comando de compilación `npm test && node prepare-assets.mjs` y de despliegue `npx wrangler@4 deploy`.
3. El archivo `wrangler.jsonc` permite aprovisionar automáticamente el espacio KV de nombre `BOLETIN`. Verificá que el despliegue muestre el vínculo a KV y el cron de actualización. Si el repo es compartido, indicá como directorio raíz de compilación la carpeta de Contanuevas.
4. Verificá la dirección HTTPS del Worker, la ficha editorial y `/api/v1/actualizacion`. Hasta la primera consulta programada se muestran el archivo y la ficha revisada. El cron consulta a las 06:17 de Argentina y reintenta cada hora hasta las 20:17 si alguna fuente falla. Conserva el último lote guardado.

La opción Render de abajo es alternativa y requiere un plan pago.

Ejecutá npm run live en una sola instancia de Node 24. Configurá PORT según el alojamiento y CONTANUEVAS_CACHE con una ruta en su disco persistente. Por defecto el proceso escucha en 127.0.0.1. Si el alojamiento lo requiere, configurá CONTANUEVAS_HOST=0.0.0.0 detrás del proxy HTTPS.

Usá /api/v1/salud para comprobar que el proceso responde y /api/v1/actualizacion para alertas de importación. Esta última ruta responde 503 si una fuente falla, si la copia no puede guardarse, si la actualización se atrasa o si todavía no terminó la primera consulta. El boletín sigue sirviendo las fichas disponibles. La consulta se repite a las 24 horas cuando sale bien y a la hora si queda degradada. El servidor tiene que permanecer en ejecución.

Para la puesta en línea queda configurar el alojamiento, el disco persistente, HTTPS y el monitor.

### Puesta en línea con Render

1. Colocá el contenido de esta carpeta en la raíz de un repositorio privado dedicado a Contanuevas. Excluí las copias locales de datos y los archivos de entorno. El plano `render.yaml` define un servicio web Starter y un disco persistente de 1 GB.
2. En Render elegí **New → Blueprint** y conectá ese repositorio. Revisá el importe que muestra el panel antes de aplicar. La web institucional tiene su propio alojamiento.
3. Una vez creado el servicio, usá la dirección HTTPS que asigne Render. Abrí el boletín, la ficha de casas particulares y `/openapi.json`. Comprobá que `/api/v1/actualizacion` responda con `estado: al-dia` y que `/api/v1/salud` muestre `cache: guardada`.
4. Configurá el monitor externo de actualización con `GET /api/v1/actualizacion`. Reservá `/api/v1/salud` para el control del proceso. Si una fuente está caída, una alerta editorial tiene más sentido que reiniciar el servidor.
5. Reiniciá el servicio desde Render y comprobá que las fichas sigan disponibles. Hacé la última revisión de enlaces, fechas y fuentes desde celular antes de usar la dirección en el lanzamiento.

## Ampliación 0.2

Ver CRITERIO-EDITORIAL.md. Catálogo de 24 referencias; 7 consultas automáticas. Respaldo oficial, técnico o periodístico; prioridad temática independiente; filtros respaldo, importancia y fuente. Resúmenes revisados con qué cambia, a quién alcanza, desde cuándo y qué hacer. Alertas de prensa pendientes de cotejo. Ámbito puede rechazar consultas; Errepar y demás referencias manuales no se importan.
