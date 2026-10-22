# Contacto y preferencias de pago

El registro sigue solicitando nombre, correo válido, móvil, DNI declarado, contraseña y consentimiento. Todos los registros públicos son clientes. La verificación de contacto está desactivada por defecto y no impide iniciar sesión ni guardar propuestas. No se marcan contactos como verificados sin una comprobación real. La integración se conserva en Mi perfil, en un apartado desplegable.

## Render: funcionamiento actual sin verificación

Después de subir el código y completar el nuevo despliegue, configura estas variables del backend:

```text
CONTACT_VERIFICATION_ENABLED=false
REQUIRE_EMAIL_VERIFICATION=false
REQUIRE_PHONE_VERIFICATION=false
```

La primera es el interruptor general: si no está definida también se considera `false`. Así, un valor antiguo `REQUIRE_EMAIL_VERIFICATION=true` no reactiva la verificación por sí solo. Guarda las variables en Render y aplica el nuevo despliegue. No hace falta cambiar variables del frontend para esta política.

Las credenciales de Resend/Twilio pueden permanecer guardadas para más adelante; no se exigen para arrancar si la verificación está desactivada. La recuperación de contraseñas por correo depende de un proveedor real configurado; no se simulan envíos ni se omite la contraseña para acceder.

## Activación futura

Configura un dominio remitente y credenciales reales de Resend, `EMAIL_FROM` y un `VERIFICATION_SECRET` privado de al menos 32 caracteres. Prueba recepción real antes de activar:

```text
CONTACT_VERIFICATION_ENABLED=true
REQUIRE_EMAIL_VERIFICATION=true
REQUIRE_PHONE_VERIFICATION=false
```

Para exigir SMS, configura las tres credenciales de Twilio Verify y cambia también `REQUIRE_PHONE_VERIFICATION=true`. Los contactos existentes conservarán su estado real y deberán verificar si se activa el requisito. El DNI sigue siendo declarado.

## Pagos

El cliente elige únicamente una preferencia: por acordar, diario, semanal, quincenal o mensual. La elección no añade recargos, no fija cuotas ni vencimientos y no altera el precio estimado. Se guarda en las respuestas de la solicitud y en su PDF preliminar; el administrador la ve en Solicitudes del cotizador.

El administrador prepara la cotización o contrato desde su panel y acuerda con el cliente la frecuencia, recargo, número de cuotas, importes y fechas. Se añade la modalidad diaria al plan administrativo. El recargo diario predeterminado es cero; el administrador puede ajustarlo. Los documentos finales emitidos conservan las condiciones acordadas; los documentos antiguos no se regeneran ni se modifican.

Las propuestas nuevas se guardan al pulsar Guardar cotización, después de poder elegir la preferencia. Una propuesta ya guardada conserva su instantánea; para cambiar respuestas se prepara otra solicitud. La preferencia se almacena en el JSON existente y no requiere migrar ni borrar datos.
