import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ClaimsService } from '../../core/claims.service';
import { RegistroHttpService } from '../../core/registro-http.service';
import { apiBaseUrl } from '../../auth-config';


/**
 * Pantalla tecnica, deliberadamente fuera del menu principal.
 *
 * Muestra el contenido del token y la bitacora de llamadas al
 * microservicio. Es informacion para desarrollo y para evidenciar el
 * funcionamiento de la autenticacion, no para el uso diario.
 */
@Component({
  selector: 'app-diagnostico',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="encabezado-pagina">
      <div>
        <h1>Detalles técnicos</h1>
        <p class="encabezado-pagina__texto">
          Contenido del token y actividad reciente contra el microservicio.
        </p>
      </div>

      <a routerLink="/" class="boton boton--neutro">Volver</a>
    </div>

    <section class="tarjeta" style="margin-bottom: 20px">
      <header class="tarjeta__cabecera">
        <h2>Token de acceso</h2>

        @if (claims(); as datos) {
          <span class="insignia insignia--exito">
            <span class="punto"></span>
            Válido hasta {{ datos.expiraEn | date: 'HH:mm' }}
          </span>
        }
      </header>

      @if (cargando()) {
        <div class="tarjeta__cuerpo">
          <div class="esqueleto" style="margin-bottom: 14px"></div>
          <div class="esqueleto"></div>
        </div>
      } @else if (claims(); as datos) {

        <div class="envoltorio-tabla">
          <table class="tabla">
            <tbody>
              <tr>
                <th>Emisor (iss)</th>
                <td class="mono">{{ datos.issuer }}</td>
              </tr>
              <tr>
                <th>Audiencia (aud)</th>
                <td class="mono">{{ datos.audience }}</td>
              </tr>
              <tr>
                <th>Directorio (tid)</th>
                <td class="mono">{{ datos.tenant }}</td>
              </tr>
              <tr>
                <th>Usuario</th>
                <td>{{ datos.usuario }}</td>
              </tr>
              <tr>
                <th>Emitido (iat)</th>
                <td>{{ datos.emitidoEn | date: 'medium' }}</td>
              </tr>
              <tr>
                <th>Expira (exp)</th>
                <td>{{ datos.expiraEn | date: 'medium' }}</td>
              </tr>
              <tr>
                <th>Roles</th>
                <td>
                  @if (datos.roles.length > 0) {
                    @for (rol of datos.roles; track rol) {
                      <span class="insignia insignia--marca mono">{{ rol }}</span>
                    }
                  } @else {
                    <span class="insignia insignia--peligro">Sin roles asignados</span>
                  }
                </td>
              </tr>
              <tr>
                <th>Permisos (scp)</th>
                <td>
                  @for (scope of datos.scopes; track scope) {
                    <span class="insignia insignia--neutra mono">{{ scope }}</span>
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="tarjeta__cuerpo" style="border-top: 1px solid var(--borde)">
          <div class="barra-herramientas">
            <button type="button" class="boton boton--neutro" (click)="alternarToken()">
              {{ tokenVisible() ? 'Ocultar' : 'Mostrar' }} token completo
            </button>

            <button type="button" class="boton boton--neutro" (click)="copiar()">
              {{ textoCopiar() }}
            </button>

            <a
              class="boton boton--fantasma"
              href="https://jwt.ms"
              target="_blank"
              rel="noopener">
              Abrir jwt.ms
            </a>
          </div>

          @if (tokenVisible()) {
            <pre class="bloque-token mono">{{ datos.tokenCrudo }}</pre>

            <p class="texto-tenue" style="margin-top: 8px">
              Este token permite actuar en tu nombre hasta que expire.
              No lo compartas ni lo incluyas en capturas de pantalla.
            </p>
          }
        </div>

      } @else {
        <div class="estado-vacio">
          <p class="estado-vacio__titulo">No se pudo obtener el token</p>
        </div>
      }
    </section>

    <section class="tarjeta">
      <header class="tarjeta__cabecera">
        <div>
          <h2>Llamadas al microservicio</h2>
          <p class="texto-tenue mono">{{ urlApi }}</p>
        </div>

        <button type="button" class="boton boton--fantasma" (click)="registro.limpiar()">
          Limpiar
        </button>
      </header>

      @if (registro.peticiones().length === 0) {
        <div class="estado-vacio">
          <p class="estado-vacio__titulo">Sin actividad registrada</p>
          <p class="estado-vacio__texto">
            Navega por la aplicación y vuelve aquí para ver las peticiones.
          </p>
        </div>
      } @else {
        <div class="envoltorio-tabla">
          <table class="tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Método</th>
                <th>Ruta</th>
                <th>Token</th>
                <th>Respuesta</th>
              </tr>
            </thead>
            <tbody>
              @for (peticion of registro.peticiones(); track $index) {
                <tr>
                  <td class="celda-secundaria">{{ peticion.hora | date: 'HH:mm:ss' }}</td>
                  <td class="mono">{{ peticion.metodo }}</td>
                  <td class="mono celda-secundaria">{{ acortar(peticion.url) }}</td>
                  <td>
                    @if (peticion.protegida) {
                      <span class="insignia insignia--marca">Requerido</span>
                    } @else {
                      <span class="insignia insignia--neutra">Público</span>
                    }
                  </td>
                  <td>
                    <span class="insignia" [class]="claseEstado(peticion.estado)">
                      {{ peticion.estado }} {{ textoEstado(peticion.estado) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .bloque-token {
      max-height: 170px;
      margin: 14px 0 0;
      padding: 14px;
      overflow: auto;
      background: #0f172a;
      border-radius: var(--radio-sm);
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .insignia + .insignia {
      margin-left: 6px;
    }

    th {
      white-space: nowrap;
      width: 1%;
    }
  `
})
export class Diagnostico implements OnInit {

  private readonly claimsService = inject(ClaimsService);

  protected readonly registro = inject(RegistroHttpService);

  protected readonly claims = this.claimsService.claims;

  protected readonly cargando = signal(true);

  protected readonly tokenVisible = signal(false);

  protected readonly textoCopiar = signal('Copiar token');

  protected readonly urlApi = apiBaseUrl;


  async ngOnInit(): Promise<void> {
    await this.claimsService.cargarClaims();

    this.cargando.set(false);
  }


  alternarToken(): void {
    this.tokenVisible.update((visible) => !visible);
  }


  async copiar(): Promise<void> {
    const token = this.claims()?.tokenCrudo;

    if (!token) {
      return;
    }

    await navigator.clipboard.writeText(token);

    this.textoCopiar.set('Copiado');

    setTimeout(() => this.textoCopiar.set('Copiar token'), 2000);
  }


  protected acortar(url: string): string {
    return url.replace(apiBaseUrl, '');
  }


  protected textoEstado(estado: number): string {
    const textos: Record<number, string> = {
      0: 'Sin conexión',
      200: 'OK',
      201: 'Creado',
      204: 'Sin contenido',
      400: 'Datos inválidos',
      401: 'No autenticado',
      403: 'Sin permisos',
      404: 'No encontrado'
    };

    return textos[estado] ?? '';
  }


  protected claseEstado(estado: number): string {
    if (estado >= 200 && estado < 300) {
      return 'insignia--exito';
    }

    if (estado === 401 || estado === 403) {
      return 'insignia--peligro';
    }

    return 'insignia--atencion';
  }
}
