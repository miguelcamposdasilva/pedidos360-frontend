import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

import { apiBaseUrl } from '../auth-config';


export interface PeticionRegistrada {
  metodo: string;
  url: string;
  estado: number;
  protegida: boolean;
  hora: Date;
}


/**
 * Bitacora de las ultimas llamadas al microservicio.
 *
 * Alimenta la pantalla de diagnostico: permite mostrar en la defensa el
 * 401 / 403 / 200 con su codigo real, sin ensuciar la interfaz normal.
 */
@Injectable({ providedIn: 'root' })
export class RegistroHttpService {

  private static readonly MAXIMO = 20;

  private readonly peticionesInternas = signal<PeticionRegistrada[]>([]);

  readonly peticiones = this.peticionesInternas.asReadonly();


  registrar(peticion: PeticionRegistrada): void {
    this.peticionesInternas.update((actuales) =>
      [peticion, ...actuales].slice(0, RegistroHttpService.MAXIMO));
  }


  limpiar(): void {
    this.peticionesInternas.set([]);
  }
}


/**
 * Interceptor de solo lectura: observa las respuestas y las anota.
 * No modifica la peticion ni interfiere con MsalInterceptor, que es
 * quien adjunta el token.
 */
export const registroHttpInterceptor: HttpInterceptorFn = (peticion, siguiente) => {

  const registro = inject(RegistroHttpService);

  /*
   * Si la ruta exige token no se deduce del header: este interceptor
   * podria ejecutarse antes que MsalInterceptor y aun no verlo. Se
   * deduce de la URL, que siempre es fiable.
   */
  const protegida =
    peticion.url.startsWith(apiBaseUrl) &&
    !peticion.url.startsWith(`${apiBaseUrl}/api/publico`);

  return siguiente(peticion).pipe(
    tap({
      next: (evento) => {
        if (evento instanceof HttpResponse) {
          registro.registrar({
            metodo: peticion.method,
            url: peticion.urlWithParams,
            estado: evento.status,
            protegida: protegida,
            hora: new Date()
          });
        }
      },

      error: (error) => {
        if (error instanceof HttpErrorResponse) {
          registro.registrar({
            metodo: peticion.method,
            url: peticion.urlWithParams,
            estado: error.status,
            protegida: protegida,
            hora: new Date()
          });
        }
      }
    })
  );
};
