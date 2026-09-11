import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input
} from '@angular/core';

import { ClaimsService } from './claims.service';


/**
 * Muestra su contenido solo si el token trae alguno de los roles indicados.
 *
 *   <button *siTieneRol="'Pedidos.Admin'">Nuevo pedido</button>
 *   <div *siTieneRol="['Pedidos.Admin', 'Pedidos.Lector']">...</div>
 *
 * Es una decision de interfaz, no de seguridad: evita ofrecer acciones que
 * el backend rechazaria con 403. Quien manipule el navegador vera el boton,
 * pero Spring Security seguira respondiendo 403.
 */
@Directive({
  selector: '[siTieneRol]',
  standalone: true
})
export class SiTieneRolDirective {

  private readonly plantilla = inject(TemplateRef<unknown>);

  private readonly contenedor = inject(ViewContainerRef);

  private readonly claimsService = inject(ClaimsService);

  readonly siTieneRol = input.required<string | string[]>();

  private visible = false;


  constructor() {
    effect(() => {
      const exigidos = this.siTieneRol();

      const roles = Array.isArray(exigidos) ? exigidos : [exigidos];

      const autorizado = roles.some(
        (rol) => this.claimsService.roles().includes(rol));

      if (autorizado && !this.visible) {
        this.contenedor.createEmbeddedView(this.plantilla);
        this.visible = true;
      } else if (!autorizado && this.visible) {
        this.contenedor.clear();
        this.visible = false;
      }
    });
  }
}
