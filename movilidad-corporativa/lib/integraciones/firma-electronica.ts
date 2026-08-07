/**
 * IProveedorFirmaElectronica — captura y registro de la firma electrónica
 * del check-in (Chunk 9). El trazo en sí ya se captura con un `<canvas>`
 * (app/check-in/_components/firma-canvas.tsx, sin cambios); esta interfaz
 * formaliza lo que un proveedor de firma electrónica real haría con ese
 * trazo: validarlo y devolver un comprobante/folio de la firma.
 *
 * Implementación real futura: sustituir `ProveedorFirmaElectronicaMock` por
 * un adaptador a un proveedor de firma electrónica certificada (p. ej.
 * DocuSign, Adobe Sign, o Firmamex/Weel para México). Ver
 * /lib/integraciones/README.md.
 */

import type { MetaProveedor } from "./tipos";

export interface DatosFirmante {
  usuarioId: string;
  nombreCompleto: string;
  /** Identificador del documento que se firma (hoy, el id de la reservación del check-in). */
  documentoId: string;
}

export interface ComprobanteFirma {
  /** Folio simulado; una integración real devolvería aquí el id de sobre/certificado del proveedor. */
  referenciaProveedor: string;
  firmanteNombre: string;
  documentoId: string;
  fechaFirma: string;
  esSimulado: boolean;
}

export interface IProveedorFirmaElectronica {
  meta: MetaProveedor;
  /** true si el trazo capturado es válido (no vacío) antes de permitir continuar con el check-in. */
  esFirmaValida(trazoDataUrl: string | null): boolean;
  /** Registra formalmente una firma ya capturada contra un documento del sistema. */
  registrarFirma(trazoDataUrl: string, firmante: DatosFirmante): Promise<ComprobanteFirma>;
}

export class ProveedorFirmaElectronicaMock implements IProveedorFirmaElectronica {
  meta: MetaProveedor = {
    nombre: "Mock interno de firma electrónica",
    esReal: false,
    notaSimulacion: "La firma se captura en un lienzo local; no se emite ningún certificado ni sobre firmado real.",
  };

  esFirmaValida(trazoDataUrl: string | null): boolean {
    return Boolean(trazoDataUrl && trazoDataUrl.length > 0);
  }

  async registrarFirma(trazoDataUrl: string, firmante: DatosFirmante): Promise<ComprobanteFirma> {
    if (!this.esFirmaValida(trazoDataUrl)) {
      throw new Error("La firma está vacía; dibújala antes de continuar.");
    }
    return {
      referenciaProveedor: `FIRMA-SIM-${Date.now().toString(36).toUpperCase()}`,
      firmanteNombre: firmante.nombreCompleto,
      documentoId: firmante.documentoId,
      fechaFirma: new Date().toISOString(),
      esSimulado: true,
    };
  }
}

export const proveedorFirmaElectronica: IProveedorFirmaElectronica = new ProveedorFirmaElectronicaMock();
