# Bienvenida, propósito y comprobantes

La portada muestra una bienvenida animada con misión, visión y objetivo de la plataforma. Se presenta una vez por sesión del navegador; se puede cerrar, continuar o volver a abrir desde Inicio y Cómo trabajamos. Los textos compartidos se editan en `frontend/src/data/purpose.ts`. Las animaciones respetan la preferencia de movimiento reducido.

Cómo trabajamos conserva el proceso existente e incorpora las tres tarjetas de propósito y una muestra visual de los proyectos.

Los proyectos conservan sus logos y muestran capturas reales de la primera pantalla de CORRY SPORT y El Gringo J&M. Las imágenes están en `frontend/public/images/projects/*-home.png`: son capturas estáticas; deben renovarse si cambia el diseño de esos sitios. La vista en vivo sigue disponible.

Al registrar un pago, el administrador puede adjuntar una captura, foto o PDF. Los métodos Yape, Plin, transferencia, tarjeta, efectivo y otro muestran instrucciones y una referencia apropiadas. Se admite PNG, JPEG o PDF hasta 5 MB, con vista previa para imágenes y opción de quitar antes de guardar. El archivo es opcional y privado, se almacena en PostgreSQL con el registro y solo los administradores pueden descargarlo. Adjuntar evidencia no verifica automáticamente una transferencia bancaria o de Yape.

No se necesitan nuevas variables de entorno, servicios de archivos ni migraciones. Se aprovecha el almacenamiento de comprobantes existente.

## Publicar

Desde PowerShell, ejecutar únicamente los comandos del bloque:

```powershell
cd D:\TUKNEX
git add frontend backend deploy
git commit -m "Agregar bienvenida proposito y comprobantes de pago"
git push
```

Esperar los despliegues de Netlify y Render. La bienvenida no se repetirá en una sesión que ya la vio; se puede abrir con el botón Conoce nuestro propósito.
