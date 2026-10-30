AURA BASE 1.3 — RELACIONES (versión de prueba)
=================================================
Novedades:
- Diseñador visual de relaciones: tarjetas de tablas arrastrables y líneas entre campos.
- Creación de relaciones 1:N entre campos compatibles con integridad referencial RESTRICT.
- Comprobación de registros huérfanos antes de crear relaciones.
- Triggers SQLite que impiden insertar referencias inexistentes, borrar registros principales relacionados o modificar claves vinculadas.
- Eliminación de relaciones y sus triggers; persistencia en el .db.
- Acceso al diseñador desde Crear, Herramientas de base de datos y panel izquierdo.
- Navegación rápida entre vistas (no son todavía ventanas simultáneas).

LIMITACIONES:
- Las relaciones se implementan con metadatos y triggers SQLite, no con cláusulas FOREIGN KEY nativas.
- Sin cascada ni edición gráfica de líneas para crear relaciones: el asistente usa cuadros de diálogo.
- Las posiciones de las tarjetas no se conservan tras recargar la aplicación.
- Consultas, formularios, informes, macros, código y exportación .mdb/.accdb NO están implementados.
- NO modificar estructura de tablas relacionadas hasta eliminar sus relaciones.
- Guardar una COPIA de SEGURIDAD de la base .db antes de probar.
- Para conservar el trabajo, pulsar Guardar .db y descargar el archivo.
- Si se muestra versión anterior, cerrar servidor antiguo, reiniciar lanzador y recargar con Ctrl+Mayús+R.

Prueba: crear Clientes (IdCliente) y Pedidos (IdPedido, IdCliente); guardar ambas tablas;
abrir Relaciones, crear Clientes.IdCliente -> Pedidos.IdCliente;
probar que no se puede insertar un pedido con IdCliente inexistente.
