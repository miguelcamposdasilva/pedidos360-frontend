import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { requiereRol } from './core/rol.guard';
import { ROL_ADMIN, ROL_LECTOR } from './auth-config';


export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/inicio/inicio').then((m) => m.Inicio)
  },

  {
    /*
     * Autenticacion + autorizacion: MsalGuard exige sesion,
     * requiereRol exige que el token traiga uno de los dos roles.
     */
    path: 'pedidos',
    canActivate: [MsalGuard, requiereRol(ROL_ADMIN, ROL_LECTOR)],
    loadComponent: () =>
      import('./pages/pedidos/pedidos').then((m) => m.Pedidos)
  },

  {
    /*
     * Pantalla tecnica: solo exige sesion. No aparece en el menu
     * principal, se llega desde el menu de usuario o el pie.
     */
    path: 'diagnostico',
    canActivate: [MsalGuard],
    loadComponent: () =>
      import('./pages/diagnostico/diagnostico').then((m) => m.Diagnostico)
  },

  {
    path: 'sin-acceso',
    loadComponent: () =>
      import('./pages/sin-acceso/sin-acceso').then((m) => m.SinAcceso)
  },

  {
    path: '**',
    redirectTo: ''
  }
];
