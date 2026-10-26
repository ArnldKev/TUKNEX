# Rediseño del cotizador — diagnóstico y plan
Fecha25-10-2026. Especificación: documento maestro entregado por el usuario en attachment381cd2b7. Ejecución autorizada sin despliegue ni instalaciones.

## Auditoría y causas comprobadas
- Git HEAD15dd41e; Next15/React19, react-hook-form/zod; Nest11, PostgreSQL/PGlite. Rutas/form/presentación/precio/modelo/AI/audio/remote draft inspeccionadas.
- Producción /cotizar: al indicarPaso4 el DOM contiene cuatro .quote-current-step visibles, con textos de etapas1–4. stepper usa la misma key={step} para div de preguntas y QuoteAudio hermanos. Claves duplicadas causan reconciliación no soportada; no es una recarga ni un cambio de URL.
- focusQuestion usa focus() con desplazamiento implícito mientras html tiene scroll-behavior:smooth. Encabezado reutilizado, altura cambiante y paneles antes del encabezado producen posiciones transitorias incluso bajo headerfijo. Corregir ciclo de render y luego focuspreventScroll+anclaje real de encabezado.
- Progreso actual (step+1)/6 marca17%enprimera entrada. quoteDefaults selecciona objetivo visibility antes de elegir.
- Audio4campos es panel de confirmación/reemplazo; no sirve para append por20campos. Móduloindependiente conbuckets/versionesnuevas conservaAPIv1.
- Remote drafts envía proyecto completo solo trasautorizar; 30revisiones y retención7–90días, AdminGuard. Userdecidió'Solo navegador hasta envío': quitar UIpúblicadegestión, noactivarautosaveservidor. Conservarlecturahistórica/endpoints.
- estimate actualmente transmiteformcompleto; nueva proyección estricta soloentradasdeprecio preserva resultado y ruta legacy.
- funcionesfiltradas por tipo y preciosreglados yaexisten; no inventarimportes.
- Resumen actual calcula despuésdepedircasilladeuso/contactoopcional yduplica pantallafinal; reorganizardespués1–5.

## Diseño elegido
Refactorización incremental de flujoexistente, sin reemplazar Next/Nest ni generadordeboceto.
Fondo claro solo /cotizar, azulprofundo + turquesaoscuro paraacciones, textoslegibles y camposblancos; cabecera/footerde marca existentes. Una tarjeta de preguntas, indicadorpasos compacto y boceto complementario; módulosadministrativosfuera. Móvil una columna, principales44px. NEXI contextual plegado, sin chat obligatorio.
Una sola instancia preguntas activa y unadictado, nombreskeysúnicos. Progreso por etapas explícitamente validadas, 0inicial y100alcompletar, retrocedernoborraavance. Datoscontactofuera de recuperaciónlocal. Texto deproyectopuederecuperarse sessionStorage hasta24h/cierrepestaña, aviso simple, sinmodales.
DictadoGroqconaviso juntoalcontrol: microactiva porpulsación, stop→transcripción→appendalcampovigente→edición. SinsegundaLLMparaevitarreinterpretación; ASRyaentregapuntuación, normalizacióndeterminista. SugerenciasNEXIsepresentanporseparado. Permiso de navegador ycancelaciónsegura. Noarchivaraudio.
Paso6muestraresumen/rango/conceptosseparadosantesdecontacto; acciónsolicitareenvíoconcuentaexistente, idempotencia yprivacidad deenvío, sinotrapreguntadeborrador.

## Paquetes y orden
1. RED flujo/progreso/recuperación yreproducciónclaves; conservar auditoriadeproducción.
2. Rootworkflow, persistencialocal yrender/foco. AgentUI1–5 enarchivossteps; agentAUDIOencontratos/provider/shared/backend; agentB cálculo privado terminado, sólomismatarifa.
3. Verificar1–5conbrowserlocalantesintegraPaso6. Precios/IA/bocetopreservados.
4. Integrarresumen6/contacto/envío + estadosprivadosexistentes.
5. Fulltestsbackend/frontend,tipos,lint,release38rutas,análisisaccesibilidad manual,360/390/768/1280errores/cancel/dictadosintético. Vozrealpendiente noacreditarconmock.
6. Verificadorfreshcontextodeevidencia, guía pasoslocalessinpublicación.

## Fuentes
Reconciliación: https://react.dev/learn/rendering-lists#rules-of-keys.
Privacidad: Ley29733(art14excepcionesnoautorizaautomáticamentedatosinnecesarios) yDS016-2024-JUSoficial. No se afirma validación legal; decisión de no enviar avances reduce el tratamiento. Dictado/datosenvíodebeninformarse.

