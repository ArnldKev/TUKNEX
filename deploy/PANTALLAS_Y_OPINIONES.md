# Logos, seguimiento y opiniones de clientes

Los proyectos de El Gringo J&M y CORRY SPORT usan los logos originales guardados en `frontend/public/images/projects`. La vista real y los enlaces a sus sitios se mantienen. La cabecera pública muestra el nombre de la sesión activa y abre su panel correspondiente.

Las solicitudes de cotización tienen tarjetas con estado, importe estimado, fecha, preferencia de pago y siguiente paso. El administrador continúa asignando los estados. Los contratos y cuotas también muestran etiquetas de estado con texto e icono, además del color.

## Opiniones reales

- El cliente escribe desde **Reseñas** o **Mi cuenta → Mi opinión**.
- Puede valorar la aplicación o el servicio de TUKNEX. No necesita tener un proyecto finalizado.
- Se guarda una opinión por cliente y tema. Puede actualizarla; cualquier edición vuelve a revisión y retira la versión anterior de la página pública.
- El cliente decide el nombre para mostrar y si autoriza la publicación. Sin esa autorización, el comentario permanece privado para su autor y el equipo.
- El administrador gestiona las opiniones desde **Administración → Opiniones de clientes**. Puede dejarlas en revisión, solicitar cambios, publicarlas si tienen consentimiento y responder.
- La respuesta será pública únicamente cuando la opinión esté publicada. La observación de moderación solo la ve su autor y el administrador.
- No se presentan como reseñas con identidad o servicio verificados ni se generan testimonios ficticios.

## Publicar los cambios

Desde `D:\TUKNEX`:

```powershell
git add frontend backend deploy
git commit -m "Mejorar cuenta proyectos y opiniones de clientes"
git push
```

Espera a que termine el backend en Render y el frontend en Netlify. La migración `006_reviews.sql` se aplica automáticamente al iniciar el backend; solo añade una tabla, no borra ni altera cuentas o documentos. No hay nuevas variables de entorno ni servicios de terceros para las opiniones. Conserva `CONTACT_VERIFICATION_ENABLED=false` si la verificación de contacto continúa desactivada.

Comprueba con una cuenta de cliente que una opinión enviada aparezca en revisión. Desde administración, verifica el consentimiento y publica una opinión autorizada. Solo entonces aparecerá en la página pública. No publiques los datos sintéticos de las pruebas locales.
