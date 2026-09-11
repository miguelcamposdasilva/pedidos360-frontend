import { Injectable, computed, inject } from '@angular/core';

import { ClaimsService } from './claims.service';
import { ROL_ADMIN, ROL_LECTOR } from '../auth-config';


/**
 * Traduce los claims tecnicos del token a un modelo listo para la vista.
 *
 * La interfaz nunca deberia mostrar cadenas como "Pedidos.Admin" o
 * "access_as_user": eso es infraestructura. Aqui se convierte en nombre,
 * iniciales y un rol legible.
 *
 * ClaimsService sigue existiendo con los datos crudos, pero ya solo lo
 * consume la pantalla de diagnostico.
 */
@Injectable({ providedIn: 'root' })
export class SesionService {

  private readonly claimsService = inject(ClaimsService);

  readonly autenticado = this.claimsService.autenticado;

  /*
   * Los claims son la fuente preferida, pero si el access token aun no
   * esta disponible se usa la cuenta de MSAL: el usuario ya inicio
   * sesion y su nombre debe aparecer igualmente.
   */
  readonly nombre = computed(() =>
    this.claimsService.claims()?.nombre ??
    this.claimsService.cuenta()?.name ??
    'Usuario');

  readonly correo = computed(() =>
    this.claimsService.claims()?.usuario ??
    this.claimsService.cuenta()?.username ??
    '');

  readonly esAdmin = computed(() =>
    this.claimsService.roles().includes(ROL_ADMIN));

  readonly esLector = computed(() =>
    this.claimsService.roles().includes(ROL_LECTOR));

  readonly sinRoles = computed(() =>
    this.claimsService.roles().length === 0);


  /** Iniciales para el avatar: "Miguel Campos" -> "MC" */
  readonly iniciales = computed(() => {
    const nombre = this.nombre().trim();

    if (!nombre) {
      return '?';
    }

    const palabras = nombre.split(/\s+/).filter((p) => p.length > 0);

    if (palabras.length === 1) {
      return palabras[0].slice(0, 2).toUpperCase();
    }

    return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
  });


  /** Nombre del rol en lenguaje de negocio, no el valor tecnico. */
  readonly rolLegible = computed(() => {
    if (this.esAdmin()) {
      return 'Administrador';
    }

    if (this.esLector()) {
      return 'Lector';
    }

    return 'Sin permisos';
  });
}
