import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ClaimsService } from './claims.service';


/**
 * Guard de autorizacion por rol.
 *
 * Se encadena DESPUES del MsalGuard: MsalGuard garantiza que hay sesion
 * (autenticacion), este guard verifica que el token traiga alguno de los
 * roles exigidos (autorizacion).
 *
 * Esto es solo experiencia de usuario: evita mostrar una pantalla que
 * terminaria en 403. La autorizacion vinculante ocurre en el backend.
 */
export function requiereRol(...rolesExigidos: string[]): CanActivateFn {

  return async () => {
    const claimsService = inject(ClaimsService);
    const router = inject(Router);

    const claims = await claimsService.cargarClaims();

    if (!claims) {
      return router.createUrlTree(['/sin-acceso']);
    }

    const autorizado = rolesExigidos.some(
      (rol) => claims.roles.includes(rol));

    if (autorizado) {
      return true;
    }

    return router.createUrlTree(['/sin-acceso'], {
      queryParams: { requiere: rolesExigidos.join(', ') }
    });
  };
}
