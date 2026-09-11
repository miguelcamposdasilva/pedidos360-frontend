import {
  BrowserCacheLocation,
  Configuration,
  LogLevel
} from '@azure/msal-browser';


export const tenantId =
  '320402ca-6827-4630-8167-c2bf3d2a6991';


export const frontendClientId =
  '470a6457-ce66-4860-91f5-ee4e6618e57c';


export const apiClientId =
  '323d4ae1-4cd7-4f3b-a10d-6cecd530b09d';


export const authority =
  `https://login.microsoftonline.com/${tenantId}`;


export const redirectUri =
  'http://localhost:4200';


export const apiScope =
  `api://${apiClientId}/access_as_user`;


/*
 * URL base del microservicio.
 *
 * Local:        http://localhost:8080
 * AWS:          https://<id>.execute-api.<region>.amazonaws.com
 *
 * Al cambiar este valor hay que cambiar tambien la clave del
 * protectedResourceMap (ver app.config.ts), porque el MsalInterceptor
 * decide a que peticiones les adjunta el token segun esa URL.
 */
export const apiBaseUrl = 'http://localhost:8080';


/*
 * Roles de aplicacion definidos en la app registration de la API.
 * El texto debe coincidir exactamente con el campo "Value" del portal
 * y con lo que valida SecurityConfig en el backend.
 */
export const ROL_ADMIN = 'Pedidos.Admin';
export const ROL_LECTOR = 'Pedidos.Lector';


export const msalConfig: Configuration = {
  auth: {
    clientId: frontendClientId,
    authority: authority,
    redirectUri: redirectUri,
    postLogoutRedirectUri: redirectUri
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage
  },
  system: {
    allowPlatformBroker: false,
    loggerOptions: {
      loggerCallback: (
        logLevel: LogLevel,
        message: string,
        containsPii: boolean
      ): void => {
        if (containsPii) {
          return;
        }


        console.log(`[MSAL ${LogLevel[logLevel]}] ${message}`);
      },
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false
    }
  }
};


/*
 * Scopes solicitados al iniciar sesion.
 *
 * openid y profile son de OpenID Connect (identidad del usuario);
 * apiScope es el permiso delegado que autoriza a llamar al microservicio.
 * MSAL Browser v5 usa siempre Authorization Code + PKCE para SPA.
 */
export const loginRequest = {
  scopes: [
    'openid',
    'profile',
    apiScope
  ]
};
