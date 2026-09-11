import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';


export type TipoNotificacion = 'exito' | 'error' | 'aviso';


export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  texto: string;
}


/**
 * Avisos flotantes.
 *
 * Los codigos HTTP no se muestran al usuario: un 403 se comunica como
 * "No tienes permisos para crear pedidos". El codigo crudo queda en el
 * registro tecnico, que vive en la pantalla de diagnostico.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {

  private readonly listaInterna = signal<Notificacion[]>([]);

  readonly lista = this.listaInterna.asReadonly();

  private siguienteId = 1;


  exito(texto: string): void {
    this.agregar('exito', texto);
  }


  error(texto: string): void {
    this.agregar('error', texto);
  }


  aviso(texto: string): void {
    this.agregar('aviso', texto);
  }


  /**
   * Traduce un fallo HTTP a lenguaje de usuario.
   * El detalle tecnico se mantiene en la consola para depuracion.
   */
  desdeError(error: HttpErrorResponse, accion: string): void {
    console.error(`Fallo al ${accion}:`, error);

    switch (error.status) {
      case 0:
        this.error(
          'No hay conexion con el servidor. Revisa tu red e intentalo de nuevo.');
        break;

      case 401:
        this.aviso('Tu sesion expiro. Vuelve a iniciar sesion.');
        break;

      case 403:
        this.error(`No tienes permisos para ${accion}.`);
        break;

      case 404:
        this.aviso('El registro ya no existe.');
        break;

      case 400:
        this.error('Revisa los datos del formulario.');
        break;

      default:
        this.error(`No fue posible ${accion}. Intentalo mas tarde.`);
    }
  }


  cerrar(id: number): void {
    this.listaInterna.update((actuales) =>
      actuales.filter((notificacion) => notificacion.id !== id));
  }


  private agregar(tipo: TipoNotificacion, texto: string): void {
    const id = this.siguienteId++;

    this.listaInterna.update((actuales) =>
      [...actuales, { id, tipo, texto }]);

    setTimeout(() => this.cerrar(id), 5000);
  }
}
