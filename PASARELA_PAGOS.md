# 💳 Pasarela de pagos (MercadoPago)

Contexto de cómo está integrado MercadoPago en cerounobikes.com y cómo
diagnosticar problemas reales de pago, para no repetir desde cero la
investigación cada vez que un cliente reporte que no pudo pagar.

## Cómo está integrado

- **Producto usado: Checkout Pro** (redirección/overlay alojado por
  MercadoPago), **no** Checkout API / Payment Brick. El cliente sale de
  `cerounobikes.com` hacia una página de MercadoPago para ingresar los datos
  de la tarjeta — el sitio nunca ve ni procesa el número de tarjeta
  directamente.
- `app/api/payments/mercadopago/preference/route.ts` — crea la "preferencia"
  (el carrito + montos + URLs de retorno) y devuelve `init_point` (o
  `sandbox_init_point`), la URL a la que se redirige al cliente.
- `app/api/payments/mercadopago/webhook/route.ts` — recibe la notificación de
  MercadoPago cuando cambia el estado de un pago, actualiza el pedido en la
  base de datos, y dispara correos de confirmación, evento de Meta
  Conversions API y sync a Google Sheets.
- Variable de entorno clave: `MERCADOPAGO_ACCESS_TOKEN` (token de
  **producción**, `APP_USR-...`). Vive solo en el servidor de Hostinger, no
  en ningún `.env*` de este repo.
- `SITE_URL` (sin prefijo `NEXT_PUBLIC_`, se lee en tiempo de ejecución) se
  usa para armar `back_urls` y `notification_url` — debe apuntar al dominio
  real en producción.

## Datos importantes de la cuenta (investigado 2026-09-02)

- **Las credenciales de producción requieren un paso de "activación"** en el
  dashboard de MercadoPago (Tus integraciones → Credenciales de producción →
  completar Industria + confirmar sitio web → botón "Activar credenciales de
  producción"). Mientras no esté activado, crear una preferencia **puede
  seguir funcionando sin error** (es una llamada de API de bajo nivel), pero
  los cobros reales con tarjeta pueden fallar para el cliente sin que quede
  ningún error visible del lado del servidor. **Esta fue la causa real** de
  que un cliente no pudiera pagar el 2026-09-02 — ya se activó.
- **Esta cuenta no tiene credenciales de sandbox/prueba funcionales.** Tanto
  la pestaña "Credenciales de prueba" de la cuenta principal como las
  credenciales propias de la aplicación del Usuario de prueba (Test User)
  devuelven exactamente los mismos valores y MercadoPago las marca como
  `live_mode: true`. Intentar tokenizar/cobrar con una tarjeta de prueba
  oficial contra ellas falla con `401 Unauthorized use of live credentials`.
  **No es un bug del código** — es una limitación/estado de esta cuenta
  puntual. No vale la pena reintentar este camino sin antes abrir un ticket
  con soporte de MercadoPago.

## Cómo verificar el estado de la pasarela

En orden de utilidad real:

1. **Probar la creación de preferencia** (prueba segura, no cobra nada ni
   requiere tarjeta — solo confirma que el servidor puede hablar con
   MercadoPago usando el token de producción):

   ```bash
   curl -X POST https://cerounobikes.com/api/payments/mercadopago/preference \
     -H "Content-Type: application/json" \
     -d '{"items":[{"id":"test","title":"test","unit_price":1000,"quantity":1}]}'
   ```

   Éxito = HTTP 201 con un `init_point` en la respuesta. Si falla, revisar
   `MERCADOPAGO_ACCESS_TOKEN` en las variables de entorno de Hostinger.

   ⚠️ Esto **no** prueba que un cobro real con tarjeta vaya a funcionar —
   solo que la conexión básica está viva. Ver el punto de "activación" arriba.

2. **Panel de MercadoPago → Actividad / Cobros** (NO el "Panel de
   monitoreo" de Tus integraciones, que solo cuenta llamadas técnicas a la
   API y puede verse en `0` incluso cuando todo funciona bien). En
   "Actividad" quedan registrados los intentos de pago reales de clientes,
   con su motivo de rechazo específico (fondos insuficientes, banco no
   autoriza, medios de pago restringidos, etc.). **Esta es la fuente más
   confiable** para entender por qué un cliente puntual no pudo pagar.

3. **`/admin/servicios` (Estado de servicios)** — el check "Checkout
   MercadoPago" corre automáticamente la prueba de preferencia del punto 1
   cada 6 horas (vía cron externo llamando a
   `/api/service-status/run?token=...`) y guarda el resultado.

4. **Alertas automáticas por correo** (agregado 2026-09-02): cuando
   "Checkout MercadoPago" (o cualquier otro servicio monitoreado) pasa de
   `ok` a `failing`/`degraded`, o se recupera, se envía un correo a
   `STORE_NOTIFICATION_EMAIL` vía Resend (`lib/email.ts` →
   `sendServiceAlertEmail`, disparado desde
   `lib/service-checks.ts` → `runAllServiceChecks`). Solo notifica en la
   transición de estado, no en cada corrida mientras sigue caído, para no
   saturar el correo.

## Qué NO hacer

- **No intentar "probar con una tarjeta de prueba" contra producción.** Las
  tarjetas de prueba oficiales de MercadoPago solo funcionan con
  credenciales genuinamente `TEST-`/sandbox — contra el token de producción
  cualquier tarjeta de prueba será rechazada, y no prueba nada real. Y como
  ya se documentó arriba, esta cuenta tampoco tiene un sandbox que funcione.
- Para reproducir o confirmar un rechazo real, usar el panel de **Actividad**
  de MercadoPago (punto 2), no intentar simular el pago.

## Checklist rápido: "un cliente no pudo pagar"

1. Correr el `curl` del punto 1. ¿Falla? → revisar
   `MERCADOPAGO_ACCESS_TOKEN` en Hostinger.
2. ¿Funciona? → revisar el panel de **Actividad** de MercadoPago para el
   motivo específico del rechazo de ese cliente.
3. Revisar en **Tus integraciones → Credenciales de producción** que no
   esté pidiendo de nuevo completar el formulario de activación (podría
   haberse desactivado o ser una cuenta/aplicación distinta).
4. Revisar `/admin/servicios` y el historial de correos de alerta por si ya
   se detectó y notificó automáticamente.
