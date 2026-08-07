# Integraciones externas (/lib/integraciones)

Este proyecto no tiene ninguna integración externa real conectada. Cada
capacidad que normalmente vendría de un proveedor externo (GPS, Uber, SSO,
correo/notificaciones, firma electrónica, almacenamiento de archivos) está
detrás de una interfaz (`IProveedorX`) con una implementación **mock**
funcional que alimenta el MVP con datos consistentes, y un punto de
extensión documentado para conectar el proveedor real más adelante.

**Regla general para reemplazar un mock por el proveedor real:** el resto
de la app importa el proveedor desde la constante exportada al final de
cada archivo (p. ej. `proveedorUber`, `proveedorGPS`), nunca la clase mock
directamente. Para activar una implementación real, sólo hay que cambiar
esa constante (o la función factory que la construye) — nada más en el
resto del código necesita cambiar, porque todo consume la interfaz.

Todo resultado que provenga de un mock se marca en la UI con el badge
**"Integración simulada"** (`components/badge-integracion-simulada.tsx`),
para que en cualquier momento quede claro qué partes de la pantalla son
simuladas.

---

## 1. `IProveedorGPS` — telemetría/ubicación

**Archivo:** `lib/integraciones/gps.ts`
**Mock:** `ProveedorGPSMock` (exportado como `proveedorGPS`)
**Usado en:** `lib/adapters/mapa.ts` → `/mapa`

**Qué hace el mock hoy:** si ya existe una lectura real en la tabla Dexie
`ubicacionesGPS` para un vehículo, la usa tal cual (por eso conectar un
proveedor real es, en el fondo, sólo cuestión de empezar a llenar esa
tabla). Si no hay lectura real, calcula una posición estable alrededor del
centro geográfico del territorio del vehículo (mismo vehículo → misma
posición siempre) y una "antigüedad" simulada de 1-20 minutos.

**Para la versión real se necesitaría:**
- Credenciales/API key del proveedor de GPS/telemática de la flotilla (p.
  ej. un dispositivo OBD conectado, o un proveedor como Samsara, Geotab).
- Un webhook o polling periódico que escriba lecturas reales en
  `db.ubicacionesGPS` (`vehiculoId`, `latitud`, `longitud`,
  `timestampLectura`, `velocidad`).

**Dónde reemplazar:** crear una clase que implemente `IProveedorGPS` en un
archivo nuevo (p. ej. `lib/integraciones/gps-real.ts`) y cambiar la
constante `proveedorGPS` exportada en `lib/integraciones/gps.ts` (o el
`import` en `lib/adapters/mapa.ts`) para apuntar a ella.

---

## 2. `IProveedorUber` — Uber for Business

**Archivo:** `lib/integraciones/uber.ts`
**Mock:** `ProveedorUberMock` (exportado como `proveedorUber`)
**Usado en:** `lib/adapters/solicitudes.ts` (`crearSolicitudDesdeWizard`, cuando el colaborador elige Uber sin requerir aprobación) y `lib/adapters/aprobaciones.ts` (`decidirSolicitud`, cuando el aprobador aprueba con Uber como medio recomendado)

**Qué hace el mock hoy:** `cotizar()` reutiliza `calcularCostoUber`/
`estimarFactorDemandaUber` de `servicioCostos` (Chunk 4) — la cotización es
matemáticamente consistente con el resto de la app, no un número inventado
aparte. `solicitarViaje()` genera un folio simulado
(`UBER-SIM-...`) y un mensaje explícito de que es una simulación. **Nunca**
se muestra como si hubiera reservado un Uber real: tanto `CotizacionUber`
como `ConfirmacionViajeUber` traen `esSimulado: true` y el badge
"Integración simulada" se muestra junto a cualquier resultado (paso 2 del
wizard y pantalla de éxito).

**Para la versión real se necesitaría:**
- Cuenta de Uber for Business y credenciales OAuth2 (client id/secret) de
  su API.
- Mapeo de territorios/direcciones de la app a coordenadas que la API de
  Uber acepte.

**Dónde reemplazar:** crear una clase que implemente `IProveedorUber` y
cambiar la constante `proveedorUber` en `lib/integraciones/uber.ts`.

---

## 3. `IProveedorSSO` — login corporativo

**Archivo:** `lib/integraciones/sso.ts`
**Mock:** `ProveedorSSOMock` (exportado como `proveedorSSO`)
**Usado en:** ningún flujo activo todavía — el MVP sigue usando el
selector de rol del Chunk 3 (`components/role-selector.tsx` +
`lib/stores/session.ts`), que ahora lee los usuarios reales sembrados en
Dexie (gestionados desde `/administracion`).

**Qué hace el mock hoy:** `iniciarSesion(usuarioId?)` no pide ninguna
credencial; resuelve de inmediato con el `Usuario` indicado (o el primer
Admin Flota sembrado) convertido a `UsuarioAutenticado`. Existe para dejar
el contrato listo, no está conectado a ninguna pantalla.

**Para la versión real se necesitaría:**
- Un proveedor de identidad corporativo (Azure AD / Microsoft Entra ID,
  Okta, o Firebase Authentication — ver `firebase-adaptadores.ts`) con
  client id/secret y dominio(s) permitido(s).
- Mapeo del correo/claim del proveedor a un `Usuario` existente en Dexie
  (por `correoCorporativo`).

**Dónde reemplazar:** implementar `IProveedorSSO` con el proveedor real, y
en `components/role-selector.tsx` sustituir la selección manual por una
llamada a `proveedorSSO.iniciarSesion()` que alimente
`useSessionStore().setUsuarioActivo(...)`.

---

## 4. `IProveedorCorreo` / `IProveedorNotificaciones`

**Archivo:** `lib/integraciones/notificaciones.ts` (interfaces y mocks) + `lib/adapters/notificaciones.ts` (bandeja y funciones de conveniencia por evento)
**Mocks:** `ProveedorCorreoMock`, `ProveedorNotificacionesMock` (exportado como `proveedorNotificaciones`)
**Usado en:**
- `lib/adapters/solicitudes.ts` — solicitud creada (notifica al aprobador) y vehículo asignado
- `lib/adapters/aprobaciones.ts` — solicitud aprobada/rechazada/cambios solicitados
- `lib/adapters/incidencias.ts` — incidencia crítica (notifica a Admin Flota)
- `lib/adapters/operacion.ts` (`enviarRecordatorio`, botón "Enviar recordatorio" en /operacion → pestaña Detalle → Pendientes del día) — recordatorio de check-in/check-out

**Qué hace el mock hoy:** `ProveedorNotificacionesMock.notificar()`
persiste la notificación en la tabla Dexie `notificaciones` (ya existía
desde el Chunk 2, pero nada la llenaba en eventos reales) y llama a
`ProveedorCorreoMock.enviarCorreo()`, que sólo escribe en la consola del
navegador que "se hubiera enviado" un correo — no envía nada. La bandeja
interna es visible desde el ícono de campana en el header
(`components/bandeja-notificaciones.tsx`), con contador de no leídas e
historial por usuario.

**Para la versión real se necesitaría:**
- Un proveedor de correo transaccional (SendGrid, Amazon SES, etc.) con
  API key y dominio verificado, para `IProveedorCorreo`.
- Para push/SMS reales, un proveedor adicional (Firebase Cloud Messaging,
  Twilio) detrás de `IProveedorNotificaciones`.

**Dónde reemplazar:** implementar ambas interfaces (o sólo
`IProveedorCorreo` si basta con correo) y cambiar las constantes
`proveedorNotificaciones`/`proveedorCorreo` en
`lib/integraciones/notificaciones.ts`. Ver también
`crearProveedorNotificacionesFirebase()` en `firebase-adaptadores.ts` como
punto de partida si el correo se resuelve con Cloud Functions.

---

## 5. `IProveedorFirmaElectronica`

**Archivo:** `lib/integraciones/firma-electronica.ts`
**Mock:** `ProveedorFirmaElectronicaMock` (exportado como `proveedorFirmaElectronica`)
**Usado en:** `app/check-in/page.tsx` (`confirmarRecepcion`), junto con el trazo capturado en `app/check-in/_components/firma-canvas.tsx` (sin cambios: sigue siendo un `<canvas>` que produce un data URL)

**Qué hace el mock hoy:** `esFirmaValida()` verifica que el trazo no esté
vacío; `registrarFirma()` toma ese trazo y lo envuelve en un
`ComprobanteFirma` con un folio simulado (`FIRMA-SIM-...`), el nombre del
firmante y la fecha — análogo a lo que devolvería un proveedor de firma
electrónica certificada, pero sin emitir ningún certificado real.

**Para la versión real se necesitaría:**
- Cuenta y API key de un proveedor de firma electrónica certificada (p.
  ej. DocuSign, Adobe Sign, o Firmamex/Weel para México con validez ante
  el SAT).
- Generar y enviar el documento (responsiva de check-in) al proveedor para
  su firma y almacenamiento del certificado.

**Dónde reemplazar:** implementar `IProveedorFirmaElectronica` con el SDK
del proveedor y cambiar la constante `proveedorFirmaElectronica` en
`lib/integraciones/firma-electronica.ts`.

---

## 6. `IProveedorAlmacenamiento`

**Archivo:** `lib/integraciones/almacenamiento.ts`
**Mock:** `ProveedorAlmacenamientoMock` (exportado como `proveedorAlmacenamiento`)
**Usado en:** `components/fotos-uploader.tsx` (check-in, check-out e incidencias — ver el prop `carpeta` en cada uso)

**Qué hace el mock hoy:** convierte cada `File` seleccionado a un data URL
(base64) con `FileReader` y lo devuelve como `ArchivoAlmacenado.url`. Ese
data URL se guarda tal cual en el arreglo `fotos: string[]` de
CheckIn/CheckOut/Incidencia (IndexedDB vía Dexie) — no hay ningún archivo
binario aparte ni ningún servidor de por medio. `eliminarArchivo()` es un
no-op: no hay nada externo que borrar.

**Para la versión real se necesitaría:**
- Un bucket de almacenamiento de objetos (Firebase Storage, Amazon S3,
  etc.) con credenciales de escritura y una política de acceso a los
  archivos subidos.

**Dónde reemplazar:** implementar `IProveedorAlmacenamiento` y cambiar la
constante `proveedorAlmacenamiento` en
`lib/integraciones/almacenamiento.ts`. Ver
`crearProveedorAlmacenamientoFirebase()` en `firebase-adaptadores.ts`.

---

## Adaptadores de Firebase (opcionales, no activos)

**Archivo:** `lib/integraciones/firebase-adaptadores.ts`

Este proyecto **no tiene el paquete `firebase` instalado** — no es una
dependencia hoy. El archivo de arriba es una plantilla: expone
`crearProveedorSSOFirebase()`, `crearProveedorNotificacionesFirebase()` y
`crearProveedorAlmacenamientoFirebase()`, cada una implementando la
interfaz correspondiente. Son seguras de importar siempre (nunca rompen el
build ni el arranque de la app), pero **lanzan un error explícito en
cuanto se invocan** mientras Firebase no esté configurado, para que quede
claro que faltan credenciales en vez de fallar en silencio.

### Cómo activarlos

1. `npm install firebase`
2. Define en `.env.local` (nunca en el repositorio) las variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   ```
3. En `lib/integraciones/firebase-adaptadores.ts`, dentro de cada función
   `crear...Firebase()`, descomenta el bloque marcado `// TODO Firebase:`
   (la llamada real al SDK ya está escrita, sólo comentada) y quita el
   `throw` de "no configurado".
4. En el archivo de integración correspondiente (`gps.ts`, `uber.ts`,
   `sso.ts`, `notificaciones.ts`, `almacenamiento.ts`), cambia la
   constante exportada para que apunte al resultado de
   `crear...Firebase()` en vez de a la clase mock — condicionado, si se
   quiere mantener el modo demo disponible, a
   `estaFirebaseConfigurado()`:

   ```ts
   export const proveedorAlmacenamiento: IProveedorAlmacenamiento = estaFirebaseConfigurado()
     ? crearProveedorAlmacenamientoFirebase()
     : new ProveedorAlmacenamientoMock();
   ```

Mientras no se complete el paso 1 (instalar `firebase`), la app sigue
funcionando exactamente igual que hoy: todas las integraciones son mocks.
