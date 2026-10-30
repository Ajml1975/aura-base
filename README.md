# AURA BASE 1.0 — Piloto web + PWA

Aplicación educativa para crear y editar bases SQLite en el navegador, con descarga/importación de archivos `.db`. **No usa servidor de datos, Cloud SQL, PostgreSQL, Google Drive ni Apps Script.**

## Instalación obligatoria de SQLite WebAssembly

El código de AURA BASE está incluido, pero **faltan dos archivos binarios de terceros** porque el entorno de empaquetado no tenía conexión a Internet. Antes de probar o publicar, descarga la versión **1.13.0** de sql.js (MIT) desde:

- https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.js
- https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/sql-wasm.wasm

Coloca ambos en `vendor/` con sus nombres exactos. No cambies la versión de uno sin cambiar el otro. La aplicación los carga **desde el mismo dominio** que AURA BASE y no requiere conectar a la CDN durante las prácticas. Revisa la licencia de sql.js: https://github.com/sql-js/sql.js

## Prueba local

1. Extrae el ZIP y coloca los dos archivos en `vendor/`.
2. Abre una terminal en la carpeta AURA_BASE_1_0.
3. Ejecuta `python -m http.server 8080`.
4. Abre `http://localhost:8080` en Chrome o Edge.
5. Pulsa «Nueva base» → «Nueva tabla» → define los campos → «Guardar estructura» → «Hoja de datos» → añade registros → «Descargar .db».
6. Recarga la página, pulsa «Abrir .db» y selecciona el archivo descargado.

No uses `file://`: los archivos WASM y service workers requieren un servidor HTTP y la PWA requiere HTTPS (o localhost).

## Publicación web y Google Sites

Sube la carpeta completa a un alojamiento estático HTTPS (por ejemplo Firebase Hosting o GitHub Pages, si el centro lo autoriza). Publica la URL de la aplicación como enlace en Google Sites. Es preferible abrirla en **pestaña propia**: los iframes pueden restringir la apertura/descarga de archivos y la instalación de PWA. En Chrome/Edge, si el navegador considera instalable la app, aparecerá «Instalar app»; de lo contrario usa el menú del navegador.

Para uso sin conexión: abre la app una vez estando en línea, espera a que el service worker haya almacenado los recursos y prueba desconectando la red. La instalación y caché pueden variar según navegador. El servicio worker solo guarda recursos estáticos; **no guarda bases de datos del alumno**.

## Seguridad y privacidad

- Los archivos `.db` se crean en memoria local mediante SQLite WebAssembly y se descargan en el dispositivo.
- No se envían registros a un backend; no se incluye telemetría ni autenticación.
- No se recomienda usar datos reales del alumnado ni de terceros en el piloto.
- El servidor de alojamiento puede registrar accesos a la página, aunque no recibe el contenido de los archivos `.db`.
- Los datos no se conservan al cerrar o recargar salvo que el alumno descargue el `.db`. Se muestra aviso al salir si hay cambios pendientes.
- No se deben abrir archivos SQLite de procedencia desconocida sin medidas adicionales. El límite de importación del piloto es 50 MB.

## Alcance real de esta entrega

Incluye: nueva base, importación `.db`, exportación `.db`, nueva tabla, diseño de campos, clave primaria única, tipos de datos educativos, requerido, único, índices, valores predeterminados, límite de longitud de texto corto, altas/edición/bajas, búsqueda local sobre hasta 500 filas y tablas de metadatos `_aura_*`.

Limitaciones: rediseño bloqueado si hay registros; no admite claves primarias compuestas, relaciones visuales, formularios, informes, consultas gráficas ni máscaras de entrada operativas. El tipo «Moneda» usa REAL y por tanto **no es adecuado para contabilidad de precisión**; deberá sustituirse por enteros de céntimos o decimal controlado en una versión posterior. «Fecha/Hora» usa fecha ISO sin hora. Los metadatos de AURA BASE se preservan en sus archivos `.db`, pero no todos se interpretan desde otros gestores SQLite.

## Pruebas mínimas de aceptación

- Crear `Empresa_Comercial.db`.
- Crear `Clientes` con `IdCliente` autonumeración/PK, `Nombre` texto corto requerido de 50, `DNI` texto corto único de 9, `Activo` Sí/No.
- Guardar estructura, insertar 2 registros, intentar DNI duplicado (debe fallar).
- Descargar y reabrir `.db`; comprobar los registros y la estructura.
- Verificar que ningún registro aparece en peticiones de red en las herramientas de desarrollo.

## Licencias

Código propio del prototipo AURA BASE. Dependencia sql.js bajo licencia MIT (descargarla por separado). SQLite es de dominio público. Icono original SVG incluido.
