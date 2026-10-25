# COT-04: activar NEXI con Groq gratuito

Estado: implementación local. No se ha publicado desde esta entrega. La comprobación real del proveedor queda pendiente hasta crear y configurar una clave de Groq.

## Qué incorpora

En el cotizador, al terminar las preguntas de cada paso, abre «NEXI · dale forma a tu idea». Autoriza la consulta y pulsa «Analizar mi idea». El análisis resume la necesidad, propone una dirección visual, alcance tentativo, exclusiones, preguntas, dependencias y criterios para comprobar el resultado. Las sugerencias concretas se pueden aplicar individualmente o descartar. Una sugerencia aceptada actualiza el boceto y el historial; puedes deshacerla. Al cambiar una respuesta, el análisis anterior deja de poder aplicarse.

En Administración → Solicitudes del cotizador, la ayuda aparece tanto en el detalle de un avance compartido como en cada solicitud formal. El servidor consulta la revisión o solicitud autorizada; el navegador no puede sustituir el contenido analizado. El análisis administrativo es de solo lectura y no modifica la idea original. El informe no se guarda al cerrar la página: el editor y expediente persistente siguen siendo COT-08/COT-09.

Esta entrega incorpora IA al cotizador y su análisis administrativo. El chat general NEXI sigue usando su orientación local. No incorpora grabación de audio, imágenes generadas, código ejecutable, tarifas nuevas, correos ni contratos.

## 1. Crear una clave gratuita

1. Abre https://console.groq.com/ y crea o accede a tu cuenta.
2. Mantén la cuenta en Free. No actives Developer ni agregues facturación para esta prueba.
3. En API Keys, crea una clave identificada como TUKNEX.
4. Guarda la clave privadamente. No la pegues en el chat, en GitHub, en capturas ni en una variable NEXT_PUBLIC_.

Groq limita solicitudes y tokens. Los modelos permitidos en esta entrega son openai/gpt-oss-120b (inicial) y openai/gpt-oss-20b (alternativa manual). La disponibilidad y la cuota exacta de tu cuenta se comprueban en la consola. No hay cambio automático de proveedor ni de plan.

## 2. Publicar los cambios

En PowerShell:

```powershell
cd D:\TUKNEX
git add backend frontend docs deploy DESIGN.md UX-CONTRACT.md premium-ui.json
git commit -m "Agregar sugerencias de IA revisables con Groq"
git push
```

Esperar a que Netlify y Render publiquen el commit. El backend aplica automáticamente la migración aditiva 008_quote_ai_quotas.sql con su mecanismo existente. Solo añade contadores de uso; no altera usuarios, solicitudes, pagos, documentos ni borradores.

Mientras NEXI_AI_ENABLED no esté en true, el cuestionario sigue funcionando y el panel informa que la IA todavía no está activada. No necesita clave para compilar.

## 3. Configurar Render

Servicio tuknex-backend → Environment → Environment Variables. Añadir:

| KEY | VALUE |
| --- | --- |
| NEXI_AI_ENABLED | true |
| NEXI_AI_PROVIDER | groq |
| NEXI_AI_MODEL | openai/gpt-oss-120b |
| GROQ_API_KEY | Tu clave privada real de Groq |

Guardar y desplegar. Las variables de borradores anteriores permanecen como estaban. No se añade ninguna clave a Netlify ni al frontend. No se necesita cambiar DATABASE_URL o crear otra base de datos.

El backend no arranca con IA activada sin clave, proveedor permitido y modelo permitido. Si aún no tienes clave, deja NEXI_AI_ENABLED=false.

Comprobar https://tuknex.netlify.app/api/quote-ai/config : debe indicar enabled true, provider groq y el modelo elegido, sin revelar la clave.

## 4. Primera prueba real

Usar un caso ficticio antes de respuestas de clientes:

- Objetivo: catálogo con pedidos por WhatsApp.
- Oferta: platos caseros, pollo a la brasa y bebidas.
- Problema: «Quiero que el cliente elija de la carta y continúe por WhatsApp. No quiero pagos online».
- Estilo: cálido, títulos grandes y fotos protagonistas.

Abrir NEXI, leer el aviso, autorizar una consulta y analizar. Confirmar que no propone pagos como requisito confirmado, que distingue dudas de decisiones y que cada sugerencia indica campos de apoyo. Aplicar una decisión visual y comprobar el boceto; deshacerla. Cambiar el texto y comprobar que el resultado anterior queda marcado y no se puede aplicar.

Desde administración, abrir un borrador o una solicitud ficticia y analizar. Confirmar que el resultado no cambia el original, el estado de atención, el precio ni el contrato.

Revisar la consola de Groq para confirmar modelo y consumo. No incluir datos personales, documentos privados, credenciales, fotografías de DNI ni información confidencial en estas pruebas. La redacción automática de contactos reconocibles no garantiza anonimato.

## Límites iniciales y fallos

- Cuota local persistente: 40 consultas globales por día UTC, 2 por minuto globales, 5 por día y 1 por minuto por conexión. Varias personas en una misma red pueden compartir ese límite.
- PostgreSQL serializa los contadores; reiniciar Render no reinicia las cuotas.
- El proveedor puede imponer un límite inferior, especialmente por tokens. La aplicación muestra la indisponibilidad y permite continuar con el formulario.
- Máximo de proyecto recibido: 12 KB. Contexto enviado limitado a los campos de idea y diseño permitidos; no se envía identidad técnica del proyecto, cuenta, nombre del negocio, correo, móvil, DNI, sitio web, presupuesto, documentos ni pagos. Un nombre o dato personal escrito dentro de un texto libre todavía requiere revisión del usuario.
- Respuesta del proveedor máxima: 32 KB; máximo 1,600 tokens de salida incluyendo razonamiento; consulta máxima de 20 segundos. Sin reintentos automáticos.
- Cancelar detiene la espera y solicita cancelar la llamada cuando la conexión lo permite; no devuelve cuota ya reservada ni garantiza que el proveedor no haya procesado la petición.
- Los resultados no se ejecutan como HTML/JS y se validan en servidor. Solo se aplican funciones de catálogo y opciones visuales permitidas. La evidencia valida campos disponibles, no demuestra por sí sola la corrección semántica del modelo; la evaluación real sigue siendo necesaria.
- No hay garantías de disponibilidad del plan gratuito. La aplicación no crea suscripciones, habilita facturación ni recurre a proveedores pagados. Si se usa una clave de una cuenta que ya tiene facturación habilitada, rigen las condiciones de esa cuenta.
- Para desactivar nuevas consultas: NEXI_AI_ENABLED=false y volver a desplegar. Las sugerencias aceptadas antes permanecen en el proyecto y no se reescriben.
- Contadores sin texto ni IP en claro: identificador HMAC por conexión y día. Limpieza tras 48 horas al iniciar, consultar y cada hora mientras el proceso esté activo; si Render duerme, al reanudar.
- No se imprimen claves, prompts ni respuestas crudas del proveedor en los logs de la integración.

## Verificación local

Pruebas de contrato e integración con proveedor simulado y base PGlite temporal; ninguna llamada real de Groq ni envío real de correo/SMS. Suites completas del backend y frontend, tipos, lint y compilación de publicación. Los resultados exactos y la revisión de navegador se registran en docs/IA_GENERATIVA.md al cerrar la entrega.

Pendiente para completar la activación: crear clave, publicar, habilitar Render, comprobar una respuesta real y evaluar el conjunto de casos ficticios. No se presenta una respuesta simulada como evaluación de calidad del proveedor.

Fuentes oficiales:
- https://console.groq.com/docs/quickstart
- https://console.groq.com/docs/models
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/your-data

