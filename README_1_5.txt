AURA BASE 1.5 — CINCO GRUPOS DE CONSULTAS
=========================================
1) SELECCIÓN: diseñador de una tabla; Vista SQL SELECT, JOIN y subconsultas de lectura.
2) ACCIÓN: crear tabla (CREATE TABLE AS SELECT), anexar (INSERT SELECT),
   actualizar (UPDATE) y eliminar (DELETE), mediante asistente visual.
   Se requiere confirmación. UPDATE y DELETE exigen un criterio.
3) TABLA CRUZADA: matriz dinámica con SUM, COUNT, AVG, MIN o MAX;
   máximo 30 columnas distintas, máximo 500 filas de resultados.
4) PARÁMETROS: pide un valor antes de ejecutar una consulta de selección.
5) SQL ESPECÍFICO: SELECT, WITH, UNION y subconsultas de lectura.
   NO se admite paso a través, SQL de definición de datos arbitrario ni
   ejecución libre de DDL/DML desde el editor, por seguridad.

La vista visual opera sobre UNA tabla; usa SQL para JOIN.
Las consultas se guardan en _aura_queries dentro del .db.
Las operaciones de acción cambian la base EN MEMORIA. Es imprescindible
guardar .db después de ejecutar. Crea una copia de seguridad ANTES de probar.
No existe deshacer de acciones tras ejecutar; restaura desde la copia.
Las relaciones 1:N previas siguen aplicando restricciones mediante triggers.

LIMITACIONES: no incluye todos los tipos de consulta avanzada de Access;
no genera .mdb ni .accdb. La exportación de estos formatos está pendiente.
El módulo requiere pruebas funcionales en el navegador antes de usarlo con alumnado.

INSTALACIÓN: extrae ZIP, ejecuta INICIAR_AURA_BASE.bat en la carpeta principal,
cierra servidores anteriores y pulsa Ctrl+Mayús+R si aparece una versión vieja.
