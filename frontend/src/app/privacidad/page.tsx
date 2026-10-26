import { PublicShell, PageIntro } from '@/components/experience/public-shell';

export const metadata = { title: 'Uso de tus datos | TUKNEX' };

export default function PrivacyPage() {
  return <PublicShell>
    <PageIntro eyebrow="TU CONFIANZA IMPORTA" title="Cómo usamos tus datos." text="Qué se conserva en tu navegador y qué compartes al usar las funciones de esta plataforma." />
    <section className="xp-container privacy-information">
      <article>
        <h2>Tu cuenta y tus proyectos</h2>
        <p>TUKNEX registra tu nombre, correo, móvil y DNI declarado para gestionar tu cuenta, tus solicitudes y los documentos del servicio. El DNI no se consulta contra una fuente oficial ni se presenta como una identidad verificada.</p>
      </article>
      <article>
        <h2>Confirmar tus contactos</h2>
        <p>Cuando el envío está habilitado, usamos proveedores de correo y SMS para enviarte códigos. Confirmar un código demuestra acceso a ese contacto. Al proveedor de correo se envía el correo de destino; al proveedor de SMS, el móvil. El DNI no se envía a esos servicios de verificación.</p>
      </article>
      <article>
        <h2>Tu avance en el cotizador</h2>
        <p>El recorrido actual conserva tu avance en esta pestaña hasta que decidas enviar una solicitud. Crea automáticamente una copia temporal en sessionStorage para recuperar las respuestas del proyecto, sus textos y decisiones al recargar. Cada copia caduca como máximo en 24 horas y pertenece a la sesión de esa pestaña, que termina al cerrarla.</p>
        <p>Esa copia excluye los campos de nombre personal, correo, teléfono, responsable de aprobación y consentimientos. Los textos del proyecto sí se incluyen y pueden contener datos personales si los escribes: no son anónimos. Evita información confidencial en equipos compartidos. Los contactos y consentimientos deben completarse de nuevo si recargas. Si el navegador impide la copia, puedes continuar en la página, pero la recuperación puede no estar disponible.</p>
        <p>Recorrer las preguntas no crea ni actualiza un borrador remoto público. Las funciones opcionales de dictado, NEXI y PDF que se describen a continuación sí transmiten datos cuando las solicitas.</p>
      </article>
      <article>
        <h2>Cálculo de la estimación y descarga de PDF</h2>
        <p>Para calcular la estimación se usan solo el tipo de proyecto, las funciones elegidas, el nivel de diseño, la prioridad del plazo y los rangos de productos y usuarios. Se indica también si escribiste otras funciones, sin enviar su contenido. El cálculo no envía tus contactos ni textos libres.</p>
        <p>Descargar una propuesta PDF es una acción manual distinta. Si preparas un PDF antes de enviar la solicitud, sus respuestas, incluidos los contactos que hayas completado, se envían al servidor para generar el documento. El cotizador muestra un aviso separado antes de esa descarga. Generar un PDF preliminar no envía una solicitud formal ni crea un contrato.</p>
      </article>
      <article>
        <h2>Dictado opcional en cada respuesta</h2>
        <p>El dictado está disponible en 20 campos de texto, incluidos nombre, correo y WhatsApp. Antes del micrófono se informa de su uso: al pulsarlo solicitas enviar tu grabación a Groq para transcribirla en español; el navegador gestiona el permiso de grabación. La voz no se anonimiza antes de enviarla y puede contener los datos personales que dictes. Puedes completar todo por escrito.</p>
        <p>Cada grabación admite hasta 60 segundos y 4 MB. La transcripción se añade automáticamente al final del texto actual de ese campo, conservando lo ya escrito, y queda editable. Puedes deshacer la última inserción mientras no la hayas modificado. No enviamos tus respuestas escritas a Groq para este dictado ni usamos un segundo modelo para ordenar o reescribir el resultado. Revisa nombres, cifras y contactos en el propio campo.</p>
        <p>TUKNEX procesa la grabación en memoria y no la archiva en disco, base de datos ni almacenamiento del navegador. Puedes detener o cancelar. Cambiar de etapa, ocultar la pestaña, cerrar el apartado del campo o salir del cotizador cancela la operación pendiente y evita incorporar resultados tardíos. Si falla la transcripción, el audio puede permanecer solo en memoria para que solicites un reintento; se descarta al cancelar o abandonar ese contexto. No hay reintentos automáticos.</p>
        <p>El texto añadido pasa a la respuesta y sigue sus reglas de recuperación local o de envío; los campos de contacto continúan excluidos de la copia temporal. El audio ya enviado está sujeto a la <a href="https://console.groq.com/docs/your-data" target="_blank" rel="noreferrer">política de datos y controles de Groq</a>. El dictado no constituye una firma ni aceptación contractual.</p>
      </article>
      <article>
        <h2>Ayuda opcional de NEXI con IA</h2>
        <p>NEXI generativo es una consulta separada del dictado. Cuando está disponible y autorizas cada consulta, enviamos a Groq una selección de respuestas del proyecto y preferencias visuales para generar sugerencias y un análisis orientativo. No enviamos los campos de identidad de la cuenta, correo, teléfono, DNI, contratos ni pagos. Ocultamos correos, enlaces y números reconocibles dentro de los textos; esta detección no garantiza anonimato. Evita información personal o confidencial.</p>
        <p>El resultado no confirma alcance, viabilidad, precio ni contrato. Se muestra en pantalla y no se guarda como informe en nuestra base. Solo las sugerencias que aceptes se incorporan al proyecto, su historial y la recuperación local de esta pestaña. La autorización de NEXI es independiente del dictado, del envío formal y de cualquier autorización comercial. Puedes continuar sin usar IA. El tratamiento del contenido enviado al proveedor está descrito en su <a href="https://console.groq.com/docs/your-data" target="_blank" rel="noreferrer">política de datos</a>.</p>
        <p>Para limitar el uso de IA y dictado conservamos contadores con un identificador derivado de la conexión, sin guardar en ellos textos, grabaciones ni direcciones IP en claro. Se limpian tras 48 horas mediante los procesos del servicio mientras está activo. Los intentos fallidos o cancelados pueden consumir cuota.</p>
      </article>
      <article>
        <h2>Solicitudes enviadas y mensajes</h2>
        <p>Al enviar una solicitud formal, tus respuestas y el PDF quedan asociados a tu cuenta y pueden ser consultados por el equipo administrador. Los mensajes del formulario de contacto también se guardan para atender tu consulta. El consentimiento comercial del cotizador es opcional y separado. Una solicitud o estimación preliminar no constituye por sí sola un contrato.</p>
      </article>
      <article>
        <h2>Registros anteriores autorizados</h2>
        <p>Pueden conservarse borradores compartidos antes de este cambio, con sus decisiones visuales y hasta 30 revisiones, conforme a la autorización y al plazo comunicado al crearlos. Ese plazo era de entre 7 y 90 días desde la creación; la limpieza periódica elimina los borradores vencidos del servicio activo. Si estaban vinculados a una cuenta, el equipo administrador puede identificar a su titular mediante el nombre y correo de esa cuenta. Una cookie de recuperación anterior puede conservar su vigencia original, de hasta 90 días.</p>
        <p>El flujo público actual no inicia ni actualiza esos borradores. Sus registros y servicios de compatibilidad permanecen separados de la recuperación local, de las solicitudes formales y de los contratos. Las funciones anteriores de transcripción y organización de textos tampoco describen el dictado directo actual. El equipo puede consultar y analizar registros autorizados desde su panel privado. Para consultar o solicitar la corrección o eliminación de datos anteriores, utiliza <a href="/contacto">Contacto</a>. La conservación técnica de copias de seguridad se atiende por separado en esas solicitudes.</p>
      </article>
      <article>
        <h2>Tus opiniones</h2>
        <p>Las opiniones sobre la aplicación o el servicio se guardan con tu cuenta para que el equipo pueda atenderlas. Solo se publican después de una revisión y si autorizas mostrar el comentario, la calificación y el nombre elegido. Sin esa autorización, el comentario es privado para ti y el equipo. Puedes actualizar tu opinión y retirar el permiso de publicación desde Mi opinión; al hacerlo deja de mostrarse en la página pública. Las observaciones de moderación son privadas y las respuestas del equipo pueden mostrarse junto a una opinión publicada.</p>
      </article>
      <article>
        <h2>Sesión y acceso a tus datos</h2>
        <p>La sesión de cuenta usa una cookie necesaria HttpOnly con una duración de 8 horas. La contraseña se almacena mediante un hash con sal. Un cliente puede consultar sus propios documentos; los administradores acceden a los registros privados necesarios para gestionar el servicio.</p>
        <p>Para consultar, corregir o solicitar la eliminación de tus datos, contacta con TUKNEX desde <a href="/contacto">el formulario de contacto</a>. Las solicitudes se atienden considerando los documentos y servicios vinculados.</p>
      </article>
    </section>
  </PublicShell>;
}
