/**
 * Subconjunto de claims del access token emitido por Microsoft Entra ID
 * que la aplicacion necesita mostrar o evaluar.
 */
export interface ClaimsDelToken {
  nombre: string;
  usuario: string;
  tenant: string;
  issuer: string;
  audience: string;
  roles: string[];
  scopes: string[];
  emitidoEn: Date | null;
  expiraEn: Date | null;
  tokenCrudo: string;
}
