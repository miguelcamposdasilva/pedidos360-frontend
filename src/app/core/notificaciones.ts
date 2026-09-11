import { Component, inject } from '@angular/core';

import { NotificacionesService } from './notificaciones.service';


@Component({
  selector: 'app-notificaciones',
  standalone: true,
  template: `
    <div class="pila-avisos" role="status" aria-live="polite">
      @for (aviso of servicio.lista(); track aviso.id) {
        <div class="aviso-flotante" [class]="'aviso-flotante--' + aviso.tipo">
          <span class="aviso-flotante__icono">
            @switch (aviso.tipo) {
              @case ('exito') { &#10003; }
              @case ('error') { &#33; }
              @default { &#8505; }
            }
          </span>

          <p>{{ aviso.texto }}</p>

          <button
            type="button"
            class="aviso-flotante__cerrar"
            aria-label="Cerrar"
            (click)="servicio.cerrar(aviso.id)">
            &times;
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .pila-avisos {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: min(94vw, 380px);
    }

    .aviso-flotante {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 13px 15px;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-left: 4px solid var(--texto-tenue);
      border-radius: 12px;
      box-shadow: var(--sombra-media);
      animation: entrar 220ms ease-out;
    }

    .aviso-flotante p {
      margin: 0;
      flex: 1;
      font-size: 14px;
      line-height: 1.5;
    }

    .aviso-flotante__icono {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border-radius: 50%;
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      background: var(--texto-tenue);
    }

    .aviso-flotante__cerrar {
      padding: 0 2px;
      border: 0;
      background: none;
      color: var(--texto-tenue);
      font-size: 19px;
      line-height: 1;
      cursor: pointer;
    }

    .aviso-flotante--exito {
      border-left-color: var(--exito);
    }

    .aviso-flotante--exito .aviso-flotante__icono {
      background: var(--exito);
    }

    .aviso-flotante--error {
      border-left-color: var(--peligro);
    }

    .aviso-flotante--error .aviso-flotante__icono {
      background: var(--peligro);
    }

    .aviso-flotante--aviso {
      border-left-color: var(--atencion);
    }

    .aviso-flotante--aviso .aviso-flotante__icono {
      background: var(--atencion);
    }

    @keyframes entrar {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `
})
export class Notificaciones {

  protected readonly servicio = inject(NotificacionesService);
}
