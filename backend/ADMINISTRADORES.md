# Administradores privados de TUKNEX

El registro web crea exclusivamente clientes. No existe selector de rol, código de configuración ni una ruta HTTP para crear administradores. Los administradores existentes conservan sus contraseñas y sesiones. Su entrada sigue siendo `/acceder`.

## Crear un administrador desde VS Code

Render Free no ofrece una consola remota: este comando se ejecuta en tu equipo y se conecta directamente a la misma base de Neon que usa Render. No necesita abrir el backend local ni guardar credenciales en el frontend.

1. Abre `D:\TUKNEX\backend` en una terminal. Si faltan dependencias, ejecuta `npm ci`.
2. Crea allí un archivo privado llamado `.env.admin.local`. Añade únicamente `DATABASE_URL=` seguido de la cadena completa copiada desde Neon. Puedes desactivar la agrupación de conexiones en Neon para obtener una conexión directa. Conserva los parámetros SSL. No copies los asteriscos de una contraseña oculta.
3. Ejecuta:

```powershell
cd D:\TUKNEX\backend
npm run admin:create -- --connection-file .env.admin.local
```

4. Revisa el servidor/base de destino que imprime. Escribe `CREAR` únicamente si corresponde a tu base de Neon.
5. Introduce nombre, correo y contraseña de al menos 12 caracteres. La contraseña y su confirmación se ocultan; no se pasan como argumentos ni se escriben en archivos.
6. Inicia sesión en `https://tuknex.netlify.app/acceder` con esos datos.

Para otro administrador, repite el comando con un correo diferente. Si un correo ya existe, el comando lo rechaza: no convierte clientes en administradores ni cambia contraseñas. El acceso privado a PostgreSQL es la autorización para operar este comando. No expongas este comando mediante un endpoint ni lo uses como comando de arranque de Render.

El archivo `.env.admin.local` queda excluido por `.gitignore`. No lo subas a GitHub, no compartas su contenido y elimínalo cuando termines si no necesitas conservarlo. Este procedimiento no copia las cuentas/cotizaciones de PostgreSQL local a Neon.

## Actualización del despliegue existente

Sube los cambios de `frontend`, `backend` y `deploy` a GitHub. Espera el nuevo despliegue de Render y Netlify. Retira `ADMIN_SETUP_TOKEN` de Render: ya no se utiliza. Las rutas antiguas `/api/auth/setup-admin`, `/api/auth/setup-status` y `/api/auth/admins` responden 404 incluso si esa variable sigue configurada. `/admin/usuarios` conserva la consulta de usuarios, sin formulario de creación.

Las pruebas usan bases temporales; no crean administradores en Neon ni alteran tu base local. No se ha creado ninguna cuenta nueva de producción al instalar esta actualización.
