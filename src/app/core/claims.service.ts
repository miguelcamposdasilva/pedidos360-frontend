import { Injectable, computed, inject, signal } from '@angular/core';
import { AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
import { MsalService } from '@azure/msal-angular';

import { apiScope, loginRequest } from '../auth-config';
import { ClaimsDelToken } from './claims.model';


/**
 * Lee los roles y scopes que vienen dentro del token.
 *
 * Detalle importante: los App Roles (Pedidos.Admin / Pedidos.Lector) estan
 * definidos en la app registration de la API, no en la del frontend. Por eso
 * NO aparecen en el id_token; viajan en el access_token cuya audiencia es la
 * API. De ahi que este servicio pida el token con acquireTokenSilent y lea
 * sus claims, en lugar de leer account.idTokenClaims.
 *
 * La decodificacion aqui es solo para mostrar informacion en pantalla y
 * habilitar u ocultar botones. La decision de seguridad real la toma el
 * backend, que valida firma, issuer, audience y vigencia.
 */
@Injectable({ providedIn: 'root' })
export class ClaimsService {

  private readonly authService = inject(MsalService);

  private readonly claimsInternos = signal<ClaimsDelToken | null>(null);

  private readonly cuentaInterna = signal<AccountInfo | null>(null);

  readonly claims = this.claimsInternos.asReadonly();

  readonly cuenta = this.cuentaInterna.asReadonly();

  readonly roles = computed(() => this.claimsInternos()?.roles ?? []);

  readonly scopes = computed(() => this.claimsInternos()?.scopes ?? []);

  /*
   * Hay sesion cuando MSAL tiene una cuenta activa. NO se condiciona a
   * haber obtenido el access token de la API: si esa peticion fallara,
   * la aplicacion mostraria la pantalla de acceso a un usuario que si
   * inicio sesion, y el login pareceria no funcionar.
   */
  readonly autenticado = computed(() => this.cuentaInterna() !== null);


  /**
   * Obtiene el access token de la API (desde la cache de MSAL o
   * renovandolo en silencio) y extrae sus claims.
   */
  async cargarClaims(): Promise<ClaimsDelToken | null> {

    const cuenta = this.cuentaActiva();

    if (!cuenta) {
      this.claimsInternos.set(null);

      return null;
    }

    try {
      const resultado = await this.authService.instance.acquireTokenSilent({
        account: cuenta,
        scopes: [apiScope]
      });

      const claims = this.decodificar(resultado.accessToken, cuenta);

      this.claimsInternos.set(claims);

      return claims;
    } catch (error) {

      /*
       * No se relanza el login desde aqui. Un acquireTokenRedirect
       * automatico en este punto produce un bucle: volver de Entra
       * dispara de nuevo esta carga, que vuelve a fallar y a redirigir.
       *
       * Cuando la aplicacion necesite el token de verdad, MsalInterceptor
       * pedira la interaccion al hacer la peticion.
       */
      if (error instanceof InteractionRequiredAuthError) {
        console.warn(
          'El access token requiere interaccion del usuario. ' +
          'Se solicitara al llamar a la API.', error);
      } else {
        console.error('No fue posible obtener el access token:', error);
      }

      this.claimsInternos.set(null);

      return null;
    }
  }


  limpiar(): void {
    this.claimsInternos.set(null);
    this.cuentaInterna.set(null);
  }


  tieneRol(rol: string): boolean {
    return this.roles().includes(rol);
  }


  tieneAlgunRol(...roles: string[]): boolean {
    return roles.some((rol) => this.tieneRol(rol));
  }


  cuentaActiva(): AccountInfo | null {
    const activa = this.authService.instance.getActiveAccount();

    if (activa) {
      this.cuentaInterna.set(activa);

      return activa;
    }

    const cuentas = this.authService.instance.getAllAccounts();

    if (cuentas.length > 0) {
      this.authService.instance.setActiveAccount(cuentas[0]);
      this.cuentaInterna.set(cuentas[0]);

      return cuentas[0];
    }

    this.cuentaInterna.set(null);

    return null;
  }


  scopesSolicitados(): string[] {
    return loginRequest.scopes;
  }


  /**
   * Decodifica el payload de un JWT. Un JWT son tres partes separadas por
   * punto, codificadas en base64url: header.payload.firma
   */
  private decodificar(token: string, cuenta: AccountInfo): ClaimsDelToken {

    const partes = token.split('.');

    if (partes.length !== 3) {
      throw new Error('El access token no tiene el formato de un JWT');
    }

    const base64 = partes[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((caracter) =>
          '%' + ('00' + caracter.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(json) as Record<string, unknown>;

    const scp = typeof payload['scp'] === 'string'
      ? (payload['scp'] as string)
      : '';

    const audiencia = payload['aud'];

    return {
      nombre: (payload['name'] as string) ?? cuenta.name ?? 'Usuario',
      usuario:
        (payload['preferred_username'] as string) ??
        (payload['upn'] as string) ??
        cuenta.username,
      tenant: (payload['tid'] as string) ?? '',
      issuer: (payload['iss'] as string) ?? '',
      audience: Array.isArray(audiencia)
        ? (audiencia as string[]).join(', ')
        : String(audiencia ?? ''),
      roles: (payload['roles'] as string[]) ?? [],
      scopes: scp ? scp.split(' ') : [],
      emitidoEn: this.aFecha(payload['iat']),
      expiraEn: this.aFecha(payload['exp']),
      tokenCrudo: token
    };
  }


  private aFecha(valor: unknown): Date | null {
    return typeof valor === 'number' ? new Date(valor * 1000) : null;
  }
}
