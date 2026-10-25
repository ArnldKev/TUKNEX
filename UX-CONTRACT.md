# Contrato UX del cotizador y NEXI

Alcance incremental: COT-04. Las políticas de dominio y servidor prevalecen. No redefine rutas ajenas.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Form | react-hook-form + src/lib/quote/form.ts | docs/COTIZADOR_GENERATIVO.md y esquemas zod | Cuestionario existente y autorización de IA sin formulario anidado | Pruebas de contrato, HTTP y navegador |
| Select/Listbox | select nativo en quote-drafts-admin.tsx | UX del cotizador existente | Popup y teclado del sistema; no se modifica en COT-04 | Navegador, versiones y teclado |
| Scrollbar | frontend/src/app/globals.css | DESIGN.md | Página y shell existentes; sin nuevo frame de scroll | Escritorio y 375px |
| Async analysis | nexi-ai.tsx + ai-api.ts | docs/IA_GENERATIVA.md | Cliente con sugerencias; administrador de solo lectura | Cancelación, timeout, error y revisión antigua |
| Project mutations | project-session.tsx + project.ts | Modelo de proyecto compartido | Aceptación explícita y deshacer | Pruebas de historial y navegador |
| Disclosure | HTML details/summary | Contrato nativo | Cerrado inicialmente en cliente y solicitudes; abierto en detalle | Teclado y estado de apertura |
| Feedback | Mensajes inline en nexi-ai.tsx | UX del cotizador existente | role=alert y aria-live=polite; sin toast nuevo | Errores y confirmaciones visibles |
| Read-only admin | AdminGuard + servicios de revisiones | Backend y permisos existentes | Borrador o solicitud formal, sin modificar el original | Pruebas HTTP 401/403/404 |

NEXI general fuera del cotizador mantiene orientación local. IA desactivada no bloquea formulario, cálculo, PDF o historial.

