# TUKNEX frontend

Desde esta carpeta:

~~~bash
npm ci
npm run dev
~~~

Next.js inicia en http://127.0.0.1:3000 sin iniciar NestJS. El puerto 3000 es fijo para evitar que dos instancias compartan la caché. Usa una sola terminal para el frontend; detén el servidor con Ctrl+C antes de reiniciarlo.

~~~bash
npm run typecheck
npm run lint
npm run build
~~~

El build estático queda en **out/**.

Copia .env.example a .env.local sólo si necesitas configurar:

- **NEXT_PUBLIC_API_URL**: origen HTTP/HTTPS del backend; admite NEXT_PUBLIC_BILLING_API_URL como alternativa temporal. Por defecto: http://127.0.0.1:4000.
- **NEXT_PUBLIC_SITE_URL**: URL pública para Open Graph. Sin configurar se usa localhost sólo en desarrollo; en producción se omite la imagen absoluta.
- **NEXT_PUBLIC_DEMO_MODE**: false usa las cuentas y sesiones reales del backend (valor por defecto).

Las variables NEXT_PUBLIC_* son públicas y se aplican al compilar. No incluyas secretos. PDFs y datos persistentes necesitan la API; el sitio público y la estimación local funcionan sin ella. El acceso de usuarios requiere el backend. Los clientes se registran en /registro; los administradores crean otros administradores en /admin/usuarios. Ejecuta npm run setup en backend para la primera configuración de PostgreSQL.

**Netlify:** Base directory: frontend · Build command: npm run build · Publish directory: out.
Configura las URLs públicas antes del build. No se ha desplegado nada.

Al finalizar el cotizador con una sesión de cliente, la propuesta se guarda en PostgreSQL mediante la API. Se consulta en /mi-cuenta/cotizaciones; el administrador ve todas en /admin/solicitudes y los clientes registrados en /admin/clientes. La pantalla confirma el guardado sólo cuando responde el servidor; si falla, conserva las respuestas y permite reintentar. Las simulaciones de pago y las cotizaciones formales siguen disponibles por separado.

Para preparar el lanzamiento revisa ../deploy/PRODUCCION.md. Guardar como invitado abre el acceso dentro del cotizador y mantiene las respuestas. El nuevo registro solicita móvil y DNI; la verificación real necesita los proveedores del backend. /privacidad explica el uso de datos. /admin/mensajes muestra contactos recibidos.
