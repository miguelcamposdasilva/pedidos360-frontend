import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners
} from '@angular/core';


import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi
} from '@angular/common/http';


import { provideRouter } from '@angular/router';


import {
  InteractionType,
  IPublicClientApplication,
  PublicClientApplication
} from '@azure/msal-browser';


import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuard,
  MsalGuardConfiguration,
  MsalInterceptor,
  MsalInterceptorConfiguration,
  MsalService
} from '@azure/msal-angular';


import { routes } from './app.routes';
import { registroHttpInterceptor } from './core/registro-http.service';


import {
  apiBaseUrl,
  apiScope,
  loginRequest,
  msalConfig
} from './auth-config';


export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}


/**
 * Configuracion del MsalGuard: cuando una ruta protegida se solicita
 * sin sesion activa, el guard dispara un login por redireccion.
 */
export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: loginRequest,
    loginFailedRoute: '/sin-acceso'
  };
}


/**
 * Configuracion del MsalInterceptor.
 *
 * El protectedResourceMap indica: "a toda peticion que vaya a esta URL,
 * adjuntale automaticamente un access token con estos scopes en el
 * header Authorization: Bearer ...".
 *
 * Las URLs que no esten en el mapa viajan SIN token, que es lo correcto:
 * nunca se debe enviar el token de la API a un tercero.
 */
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string> | null>();

  protectedResourceMap.set(`${apiBaseUrl}/api/*`, [apiScope]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: protectedResourceMap
  };
}


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    /*
     * withInterceptorsFromDi() es obligatorio: MsalInterceptor es un
     * interceptor basado en clases (HTTP_INTERCEPTORS), no funcional.
     */
    provideHttpClient(
      withInterceptorsFromDi(),

      /*
       * Interceptor de solo lectura que alimenta la pantalla de
       * diagnostico. No modifica la peticion.
       */
      withInterceptors([registroHttpInterceptor])
    ),

    {
      provide: MSAL_INSTANCE,
      useFactory: msalInstanceFactory
    },

    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory
    },

    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory
    },

    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },

    MsalService,
    MsalGuard,
    MsalBroadcastService,

    /*
     * MSAL Browser v5 exige initialize() antes de cualquier otra
     * operacion. Hacerlo aqui garantiza que el guard y el interceptor
     * encuentren la instancia lista, en vez de depender del ngOnInit
     * del componente raiz.
     */
    provideAppInitializer(() => {
      const msalService = inject(MsalService);

      return msalService.instance.initialize();
    })
  ]
};
