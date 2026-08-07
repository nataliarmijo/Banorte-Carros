import { describe, expect, it } from "vitest";
import {
  crearProveedorAlmacenamientoFirebase,
  crearProveedorNotificacionesFirebase,
  crearProveedorSSOFirebase,
  estaFirebaseConfigurado,
} from "./firebase-adaptadores";

describe("adaptadores de Firebase (plantilla, sin el SDK instalado)", () => {
  it("estaFirebaseConfigurado() es false sin las variables de entorno NEXT_PUBLIC_FIREBASE_*", () => {
    expect(estaFirebaseConfigurado()).toBe(false);
  });

  it("cada proveedor se puede construir sin romper el módulo (nunca importa el SDK de forma estática)", () => {
    expect(() => crearProveedorSSOFirebase()).not.toThrow();
    expect(() => crearProveedorNotificacionesFirebase()).not.toThrow();
    expect(() => crearProveedorAlmacenamientoFirebase()).not.toThrow();
  });

  it("cada proveedor declara esReal: false mientras Firebase no esté configurado", () => {
    expect(crearProveedorSSOFirebase().meta.esReal).toBe(false);
    expect(crearProveedorNotificacionesFirebase().meta.esReal).toBe(false);
    expect(crearProveedorAlmacenamientoFirebase().meta.esReal).toBe(false);
  });

  it("llamar a un método lanza un error explícito (no falla en silencio) mientras no haya credenciales", async () => {
    await expect(crearProveedorSSOFirebase().iniciarSesion()).rejects.toThrow(/Firebase no está configurado/);
    await expect(
      crearProveedorNotificacionesFirebase().notificar({ usuarioDestinoId: "user-1", tipo: "SOLICITUD_CREADA", mensaje: "x" })
    ).rejects.toThrow(/Firebase no está configurado/);
  });
});
