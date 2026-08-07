/**
 * Adaptadores alternativos con Firebase (Authentication, Firestore,
 * Storage) para IProveedorSSO, IProveedorNotificaciones e
 * IProveedorAlmacenamiento.
 *
 * IMPORTANTE — por qué este archivo no importa el SDK de Firebase:
 * el paquete `firebase` NO está instalado en este proyecto (no es una
 * dependencia hoy). Si este archivo hiciera `import { ... } from
 * "firebase/app"` de forma estática, el build fallaría para TODOS los
 * usuarios del proyecto, tengan o no credenciales de Firebase — exactamente
 * lo que el enunciado pide evitar ("sin romper la app si no hay
 * credenciales"). Por eso este archivo es una PLANTILLA: los tres
 * `crear...Firebase()` de abajo son seguros de importar y llamar siempre
 * (nunca rompen el build ni el arranque de la app), pero lanzan un error
 * explícito en cuanto se invocan, salvo que actives Firebase siguiendo los
 * 3 pasos de abajo.
 *
 * Cómo activar (cuando haya un proyecto de Firebase real):
 *   1. `npm install firebase`
 *   2. Define las variables de entorno (`.env.local`, nunca en el repo):
 *        NEXT_PUBLIC_FIREBASE_API_KEY=
 *        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
 *        NEXT_PUBLIC_FIREBASE_PROJECT_ID=
 *        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
 *        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
 *        NEXT_PUBLIC_FIREBASE_APP_ID=
 *   3. En cada función de abajo, descomenta el bloque marcado `// TODO
 *      Firebase:` con la llamada real al SDK (ya está escrito, sólo
 *      comentado) y elimina el `throw` de "no configurado".
 *   4. En el punto de integración correspondiente (ver README.md), sustituye
 *      el mock por `crearProveedorXFirebase()`.
 *
 * Ver /lib/integraciones/README.md para el detalle completo por integración.
 */

import type { IProveedorAlmacenamiento } from "./almacenamiento";
import type { IProveedorNotificaciones, DatosNotificacion, EnvioNotificacion } from "./notificaciones";
import type { IProveedorSSO, UsuarioAutenticado } from "./sso";
import type { MetaProveedor } from "./tipos";

const VARS_ENTORNO_FIREBASE = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

/** true sólo si las 6 variables de entorno de Firebase están definidas. No verifica que sean válidas. */
export function estaFirebaseConfigurado(): boolean {
  return VARS_ENTORNO_FIREBASE.every((clave) => Boolean(process.env[clave]));
}

const METADATA_FIREBASE_NO_CONFIGURADO: MetaProveedor = {
  nombre: "Firebase (no configurado)",
  esReal: false,
  notaSimulacion: "Faltan variables de entorno NEXT_PUBLIC_FIREBASE_*; instala `firebase` y complétalas para activar esta integración.",
};

function exigirFirebaseConfigurado(nombreIntegracion: string): void {
  if (!estaFirebaseConfigurado()) {
    throw new Error(
      `${nombreIntegracion}: Firebase no está configurado en este entorno. Define las variables NEXT_PUBLIC_FIREBASE_* y ejecuta \`npm install firebase\` antes de usar este proveedor (ver /lib/integraciones/README.md).`
    );
  }
}

// ---------------------------------------------------------------------------
// Firebase Authentication -> IProveedorSSO
// ---------------------------------------------------------------------------
export function crearProveedorSSOFirebase(): IProveedorSSO {
  return {
    meta: estaFirebaseConfigurado()
      ? { nombre: "Firebase Authentication", esReal: true }
      : METADATA_FIREBASE_NO_CONFIGURADO,

    async iniciarSesion(usuarioId?: string): Promise<UsuarioAutenticado | null> {
      void usuarioId;
      exigirFirebaseConfigurado("IProveedorSSO (Firebase Authentication)");

      // TODO Firebase: una vez instalado el SDK, reemplaza este throw por:
      //
      // const { initializeApp, getApps } = await import("firebase/app");
      // const { getAuth, signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
      // const app = getApps()[0] ?? initializeApp({
      //   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      //   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      //   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      //   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      // });
      // const credencial = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
      // // Mapear credencial.user (uid/email) al Usuario correspondiente en Dexie
      // // (por correoCorporativo) y devolverlo como UsuarioAutenticado con esSimulado: false.
      throw new Error("Firebase Authentication todavía no está implementado en este adaptador (ver comentarios TODO).");
    },

    async cerrarSesion(): Promise<void> {
      exigirFirebaseConfigurado("IProveedorSSO (Firebase Authentication)");
      // TODO Firebase: const { getAuth, signOut } = await import("firebase/auth"); await signOut(getAuth());
      throw new Error("Firebase Authentication todavía no está implementado en este adaptador (ver comentarios TODO).");
    },
  };
}

// ---------------------------------------------------------------------------
// Cloud Firestore (+ Cloud Messaging para push) -> IProveedorNotificaciones
// ---------------------------------------------------------------------------
export function crearProveedorNotificacionesFirebase(): IProveedorNotificaciones {
  return {
    meta: estaFirebaseConfigurado()
      ? { nombre: "Cloud Firestore + Cloud Messaging", esReal: true }
      : METADATA_FIREBASE_NO_CONFIGURADO,

    async notificar(datos: DatosNotificacion): Promise<EnvioNotificacion> {
      void datos;
      exigirFirebaseConfigurado("IProveedorNotificaciones (Firestore)");

      // TODO Firebase: una vez instalado el SDK, reemplaza este throw por:
      //
      // const { initializeApp, getApps } = await import("firebase/app");
      // const { getFirestore, collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      // const app = getApps()[0] ?? initializeApp({ /* config, ver crearProveedorSSOFirebase */ });
      // await addDoc(collection(getFirestore(app), "notificaciones"), {
      //   ...datos,
      //   fechaCreacion: serverTimestamp(),
      //   leida: false,
      // });
      // // Para push real, disparar aquí una Cloud Function que use Firebase Cloud Messaging.
      throw new Error("Firestore todavía no está implementado en este adaptador (ver comentarios TODO).");
    },
  };
}

// ---------------------------------------------------------------------------
// Firebase Storage -> IProveedorAlmacenamiento
// ---------------------------------------------------------------------------
export function crearProveedorAlmacenamientoFirebase(): IProveedorAlmacenamiento {
  return {
    meta: estaFirebaseConfigurado() ? { nombre: "Firebase Storage", esReal: true } : METADATA_FIREBASE_NO_CONFIGURADO,

    async guardarArchivo(archivo: File, carpeta: string) {
      void archivo;
      void carpeta;
      exigirFirebaseConfigurado("IProveedorAlmacenamiento (Firebase Storage)");

      // TODO Firebase: una vez instalado el SDK, reemplaza este throw por:
      //
      // const { initializeApp, getApps } = await import("firebase/app");
      // const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      // const app = getApps()[0] ?? initializeApp({ /* config, ver crearProveedorSSOFirebase */ });
      // const referencia = ref(getStorage(app), `${carpeta}/${crypto.randomUUID()}-${archivo.name}`);
      // await uploadBytes(referencia, archivo);
      // const url = await getDownloadURL(referencia);
      // return { referencia: referencia.fullPath, url, nombreOriginal: archivo.name, tamanioBytes: archivo.size, fechaSubida: new Date().toISOString(), esSimulado: false as const };
      throw new Error("Firebase Storage todavía no está implementado en este adaptador (ver comentarios TODO).");
    },

    async eliminarArchivo(referencia: string): Promise<void> {
      void referencia;
      exigirFirebaseConfigurado("IProveedorAlmacenamiento (Firebase Storage)");
      // TODO Firebase: const { getStorage, ref, deleteObject } = await import("firebase/storage"); await deleteObject(ref(getStorage(), referencia));
      throw new Error("Firebase Storage todavía no está implementado en este adaptador (ver comentarios TODO).");
    },
  };
}
