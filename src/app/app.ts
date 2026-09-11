import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';

import { Subject, filter, takeUntil } from 'rxjs';

import { ClaimsService } from './core/claims.service';
import { SesionService } from './core/sesion.service';
import { Notificaciones } from './core/notificaciones';
import { loginRequest, redirectUri } from './auth-config';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Notificaciones],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {

  protected readonly sesion = inject(SesionService);

  private readonly claimsService = inject(ClaimsService);

  private readonly authService = inject(MsalService);

  private readonly broadcastService = inject(MsalBroadcastService);

  private readonly destruido = new Subject<void>();

  protected readonly cargando = signal(true);

  protected readonly menuAbierto = signal(false);


  ngOnInit(): void {

    /*
     * MSAL ya fue inicializado por el provideAppInitializer de app.config.ts.
     *
     * handleRedirectObservable procesa la respuesta que Entra ID devuelve
     * al volver del login: intercambia el codigo de autorizacion por los
     * tokens usando el code_verifier de PKCE. Sin esta llamada la sesion
     * nunca se completa tras el redirect.
     */
    this.authService.handleRedirectObservable()
      .pipe(takeUntil(this.destruido))
      .subscribe({
        next: (resultado) => {
          if (resultado?.account) {
            this.authService.instance.setActiveAccount(resultado.account);
          }

          this.sincronizarCuenta();
        },

        error: (error) =>
          console.error('Error al procesar la respuesta de Entra ID:', error)
      });

    this.broadcastService.msalSubject$
      .pipe(
        filter((evento: EventMessage) =>
          evento.eventType === EventType.LOGIN_SUCCESS ||
          evento.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
          evento.eventType === EventType.ACTIVE_ACCOUNT_CHANGED),
        takeUntil(this.destruido))
      .subscribe(() => this.sincronizarCuenta());

    /*
     * inProgress$ emite None cuando MSAL termino de procesar cualquier
     * interaccion pendiente, incluido el retorno del redirect de login.
     */
    this.broadcastService.inProgress$
      .pipe(
        filter((estado: InteractionStatus) => estado === InteractionStatus.None),
        takeUntil(this.destruido))
      .subscribe(() => {
        this.sincronizarCuenta();
        this.cargando.set(false);
      });
  }


  ngOnDestroy(): void {
    this.destruido.next();
    this.destruido.complete();
  }


  iniciarSesion(): void {
    this.authService.loginRedirect(loginRequest);
  }


  cerrarSesion(): void {
    const cuenta = this.claimsService.cuentaActiva();

    this.cerrarMenu();
    this.claimsService.limpiar();

    this.authService.logoutRedirect({
      account: cuenta ?? undefined,
      postLogoutRedirectUri: redirectUri
    });
  }


  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }


  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }


  private sincronizarCuenta(): void {
    if (!this.claimsService.cuentaActiva()) {
      this.claimsService.limpiar();

      return;
    }

    void this.claimsService.cargarClaims();
  }
}
