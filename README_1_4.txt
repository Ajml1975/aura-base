AURA BASE 1.4 — CONSULTAS (versión educativa)
================================================
NOVEDADES
- Panel Consultas con creación, edición, eliminación y guardado de consultas dentro del .db.
- Diseñador visual: tabla de origen, campos, criterios y orden.
- Vista SQL: consultas SELECT de lectura.
- Ejecución y tabla de resultados (máximo 500 filas mostradas).
- Pestaña Crear → Diseño de consulta.
- Conserva funciones anteriores: tablas, relaciones y Guardar como.

LIMITACIONES
- El diseñador visual utiliza UNA sola tabla. Para consultas JOIN entre varias tablas utiliza Vista SQL.
- No admite consultas de acción (INSERT/UPDATE/DELETE), parámetros interactivos ni asistentes avanzados.
- En Vista SQL solo se permiten SELECT de lectura; el filtro de seguridad no sustituye a un sandbox para SQL no confiable.
- .mdb/.accdb siguen pendientes de conversión.
- Antes de abrir una base existente, haz una copia de seguridad.
- Las consultas se conservan al descargar la base .db desde Archivo > Guardar como.
- Para abrir desde Windows ejecuta INICIAR_AURA_BASE.bat en esta carpeta.
