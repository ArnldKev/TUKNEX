# Probar la entrega local sin modificar Neon

Esta prueba usa la aplicación real contra una base PGlite temporal con cuentas, comprobantes e IA **sintéticos**. No envía correos ni consulta Groq o Neon. Sirve para recorrer las funciones y revisar las pantallas; no acredita la calidad ni disponibilidad del proveedor real. No introduzcas datos personales reales en esta fixture.

El backend habitual aplica las migraciones pendientes al arrancar. Si el `.env` local apunta a Neon, no iniciarlo para probar esta entrega antes de aprobar y verificar el respaldo real. La alternativa siguiente bloquea la lectura de `.env` dentro del runner y utiliza una base separada.

## Terminal 1: aplicación y datos temporales de QA

```powershell
cd D:\TUKNEX\backend
npm run test:integral -- --serve
```

Primero compila y ejecuta el recorrido integral. Al pasar, mantiene la API en `http://127.0.0.1:4406`. Las cuentas de prueba y sus identificadores se escriben en `D:\TUKNEX\.qa-integral\journey-fixture.json`. Son contraseñas sintéticas exclusivas de esa base temporal, no tus credenciales de producción.

La IA de este entorno devuelve un caso controlado: catálogo de25 productos para3 sedes, pedidos por WhatsApp y exclusión de pagos online. Para comprobar edición/aprobación sin que se rechace una cantidad inventada, escribe precisamente ese caso. Para probar errores, modifica los números o elimina una restricción: se debe conservar el original y rechazar una interpretación incompatible. El cupo se reinicia únicamente al preparar esta fixture; no se modifica el cupo del producto ni de Groq.

## Terminal 2: frontend de desarrollo

```powershell
cd D:\TUKNEX\frontend
$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:4406'
$env:NEXT_PUBLIC_DEMO_MODE='false'
npm run dev
```

Abrir **http://127.0.0.1:3000** (ese origen está permitido por la fixture). Iniciar sesión con las cuentas del archivo anterior. No cambiar las variables privadas de Render/Netlify ni el `.env` real para esta prueba. Las asignaciones de variables anteriores se limitan a esa terminal.

Recorrido sugerido: recuperar un borrador del cotizador → revisar/ordenar/aprobar/deshacer → ver propuestas y sus versiones → entrar como administrador/responsable → consultar contrato y evidencias → editar hitos → reportar un pago con archivo sintético → observar o confirmar desde administración → actualizar el cliente → descargar expediente.

Los comprobantes de QA se identifican como tales. Una imagen sintética no demuestra un pago real. Los informes del proveedor están simulados, pero las rutas, roles, contratos, cuotas, decisiones, documentos y saldos se gestionan con el código real.

## Cerrar y volver a la configuración habitual

Detener ambas terminales con Ctrl+C. La fixture intenta cerrar y eliminar su directorio temporal; si el terminal fuerza la terminación puede quedar una carpeta temporal de pruebas, cuya ruta figura en el JSON. No borrar directorios de datos reales para limpiarla.

Cerrar la terminal del frontend elimina sus overrides de entorno. No arrancar el backend habitual contra Neon hasta seguir [la preparación de respaldo y publicación](ACTUALIZACION_INTEGRAL.md). Las migraciones reales, entrega de correos, micrófono físico y consulta Groq real requieren sus comprobaciones propias.
