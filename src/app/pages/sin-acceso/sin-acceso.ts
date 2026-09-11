import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';


@Component({
  selector: 'app-sin-acceso',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="tarjeta" style="max-width: 520px; margin: 6vh auto 0">
      <div class="tarjeta__cuerpo estado-vacio">
        <div class="estado-vacio__icono">&#128274;</div>

        <p class="estado-vacio__titulo">No tienes acceso a esta seccion</p>

        <p class="estado-vacio__texto">
          Tu sesion es valida, pero tu cuenta no tiene un perfil que
          permita consultar esta informacion.
        </p>

        @if (rolRequerido) {
          <p class="texto-tenue" style="margin-top: 14px">
            Solicita a un administrador el perfil correspondiente.
          </p>
        }

        <a routerLink="/" class="boton boton--neutro" style="margin-top: 20px">
          Volver al inicio
        </a>
      </div>
    </section>
  `
})
export class SinAcceso {

  private readonly ruta = inject(ActivatedRoute);

  protected readonly rolRequerido =
    this.ruta.snapshot.queryParamMap.get('requiere');
}
