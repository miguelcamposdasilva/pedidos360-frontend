import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { MsalService } from '@azure/msal-angular';

import { SesionService } from '../../core/sesion.service';
import { PedidosService } from '../../core/pedidos.service';
import { Pedido } from '../../core/pedido.model';
import { loginRequest } from '../../auth-config';


/**
 * Pantalla de entrada.
 *
 * Sin sesion muestra la presentacion y el acceso; con sesion, un resumen
 * del estado de los pedidos.
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  template: `
    @if (!sesion.autenticado()) {

      <section class="portada">

        <div class="portada__texto-columna">
          <span class="etiqueta-curso">
            <span class="punto"></span>
            Desarrollo Cloud Native I
          </span>

          <h1 class="portada__titulo">
            La gestión de pedidos,<br />
            <span class="acento">en un solo lugar</span>
          </h1>

          <p class="portada__bajada">
            Registra, sigue y controla los pedidos de tus clientes.
            El acceso está protegido con tu cuenta corporativa
            y los permisos de tu perfil.
          </p>

          <button type="button" class="boton-microsoft" (click)="iniciarSesion()">
            <svg viewBox="0 0 21 21" aria-hidden="true" focusable="false">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>

            Iniciar sesión con Microsoft
          </button>

          <p class="portada__nota">
            Acceso restringido a cuentas del directorio corporativo.
            Se te redirigirá a Microsoft para autenticarte.
          </p>

          <ul class="ventajas">
            <li>
              <span class="ventajas__icono">&#128273;</span>
              <span>
                <strong>Sin contraseñas nuevas</strong>
                Entras con la cuenta que ya usas.
              </span>
            </li>

            <li>
              <span class="ventajas__icono">&#128100;</span>
              <span>
                <strong>Permisos por perfil</strong>
                Cada usuario ve solo lo que le corresponde.
              </span>
            </li>

            <li>
              <span class="ventajas__icono">&#9729;</span>
              <span>
                <strong>Datos en la nube</strong>
                Disponibles desde cualquier equipo.
              </span>
            </li>
          </ul>
        </div>

        <!--
          Vista previa decorativa de la aplicacion. Usa formas abstractas
          en lugar de datos inventados para no simular informacion real.
        -->
        <div class="vista-previa" aria-hidden="true">
          <div class="vista-previa__ventana">
            <div class="vista-previa__barra">
              <span></span><span></span><span></span>
            </div>

            <div class="vista-previa__cuerpo">
              <div class="vista-previa__metricas">
                @for (metrica of [1, 2, 3]; track metrica) {
                  <div class="vista-previa__metrica">
                    <div class="linea linea--corta"></div>
                    <div class="linea linea--valor"></div>
                  </div>
                }
              </div>

              <div class="vista-previa__lista">
                @for (fila of filasPrevias; track fila.id) {
                  <div class="vista-previa__fila">
                    <div class="linea linea--media"></div>
                    <span class="insignia" [class]="fila.clase">{{ fila.estado }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </section>

    } @else {

      <div class="encabezado-pagina">
        <div>
          <h1>Hola, {{ primerNombre() }}</h1>
          <p class="encabezado-pagina__texto">Resumen de la operacion</p>
        </div>

        <a routerLink="/pedidos" class="boton boton--neutro">Ver todos los pedidos</a>
      </div>

      @if (sesion.sinRoles()) {
        <div class="tarjeta">
          <div class="tarjeta__cuerpo estado-vacio">
            <div class="estado-vacio__icono">&#128274;</div>

            <p class="estado-vacio__titulo">Tu cuenta aun no tiene permisos</p>

            <p class="estado-vacio__texto">
              Un administrador debe asignarte un perfil de acceso
              para que puedas consultar los pedidos.
            </p>
          </div>
        </div>
      } @else {

        <div class="rejilla-metricas">
          <div class="metrica">
            <p class="metrica__etiqueta">Pedidos totales</p>
            <p class="metrica__valor">{{ cargando() ? '--' : total() }}</p>
            <p class="metrica__pie">Registrados en el sistema</p>
          </div>

          <div class="metrica">
            <p class="metrica__etiqueta">Pendientes</p>
            <p class="metrica__valor">{{ cargando() ? '--' : pendientes() }}</p>
            <p class="metrica__pie">Esperando preparacion</p>
          </div>

          <div class="metrica">
            <p class="metrica__etiqueta">Entregados</p>
            <p class="metrica__valor">{{ cargando() ? '--' : entregados() }}</p>
            <p class="metrica__pie">Completados</p>
          </div>

          <div class="metrica">
            <p class="metrica__etiqueta">Monto acumulado</p>
            <p class="metrica__valor">
              {{ cargando() ? '--' : (montoTotal() | currency: 'CLP' : 'symbol-narrow' : '1.0-0') }}
            </p>
            <p class="metrica__pie">Suma de todos los pedidos</p>
          </div>
        </div>

        <section class="tarjeta">
          <header class="tarjeta__cabecera">
            <h2>Ultimos pedidos</h2>
            <a routerLink="/pedidos" class="boton boton--fantasma">Ver todos</a>
          </header>

          @if (cargando()) {
            <div class="tarjeta__cuerpo">
              @for (fila of [1, 2, 3]; track fila) {
                <div class="esqueleto" style="margin-bottom: 14px"></div>
              }
            </div>
          } @else if (recientes().length === 0) {
            <div class="estado-vacio">
              <div class="estado-vacio__icono">&#128230;</div>
              <p class="estado-vacio__titulo">Todavia no hay pedidos</p>
              <p class="estado-vacio__texto">Los pedidos que registres apareceran aqui.</p>
            </div>
          } @else {
            <div class="envoltorio-tabla">
              <table class="tabla">
                <tbody>
                  @for (pedido of recientes(); track pedido.id) {
                    <tr>
                      <td class="celda-principal">{{ pedido.cliente }}</td>
                      <td class="celda-secundaria">{{ pedido.descripcion }}</td>
                      <td>
                        <span class="insignia" [class]="claseEstado(pedido.estado)">
                          {{ nombreEstado(pedido.estado) }}
                        </span>
                      </td>
                      <td class="numerico">
                        {{ pedido.monto | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }
    }
  `,
  styles: `
    .portada {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: center;
      gap: 56px;
      min-height: calc(100vh - 180px);
      padding: 24px 0;
    }

    .etiqueta-curso {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      background: var(--marca-suave);
      border-radius: 999px;
      color: var(--marca-oscura);
      font-size: 12.5px;
      font-weight: 600;
    }

    .portada__titulo {
      margin: 20px 0 16px;
      font-size: clamp(32px, 4.4vw, 46px);
      line-height: 1.12;
      letter-spacing: -0.028em;
    }

    .acento {
      color: var(--marca);
    }

    .portada__bajada {
      max-width: 46ch;
      margin-bottom: 28px;
      color: var(--texto-medio);
      font-size: 16px;
      line-height: 1.65;
    }

    /* Boton de identidad: sigue la guia visual de Microsoft
       (fondo claro, logo a la izquierda). */
    .boton-microsoft {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 13px 22px;
      background: var(--superficie);
      border: 1px solid var(--borde-fuerte);
      border-radius: var(--radio-sm);
      box-shadow: var(--sombra-baja);
      font: inherit;
      font-size: 15px;
      font-weight: 600;
      color: var(--texto);
      cursor: pointer;
      transition:
        box-shadow 160ms ease,
        border-color 160ms ease,
        transform 160ms ease;
    }

    .boton-microsoft:hover {
      border-color: var(--marca);
      box-shadow: var(--sombra-media);
      transform: translateY(-1px);
    }

    .boton-microsoft svg {
      width: 19px;
      height: 19px;
      flex-shrink: 0;
    }

    .portada__nota {
      max-width: 42ch;
      margin-top: 14px;
      color: var(--texto-tenue);
      font-size: 12.5px;
      line-height: 1.55;
    }

    .ventajas {
      display: grid;
      gap: 16px;
      margin: 36px 0 0;
      padding: 26px 0 0;
      border-top: 1px solid var(--borde);
      list-style: none;
    }

    .ventajas li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      color: var(--texto-medio);
      font-size: 13.5px;
      line-height: 1.5;
    }

    .ventajas__icono {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: 9px;
      font-size: 14px;
    }

    .ventajas strong {
      display: block;
      color: var(--texto);
      font-size: 14px;
      font-weight: 600;
    }

    /* --- Vista previa decorativa --- */

    .vista-previa {
      position: relative;
      display: grid;
      place-items: center;
    }

    .vista-previa::before {
      content: '';
      position: absolute;
      inset: -12% -6%;
      background:
        radial-gradient(circle at 30% 30%, rgba(37, 99, 235, 0.16), transparent 62%),
        radial-gradient(circle at 75% 70%, rgba(18, 183, 106, 0.12), transparent 60%);
      filter: blur(6px);
    }

    .vista-previa__ventana {
      position: relative;
      width: 100%;
      max-width: 430px;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: var(--radio-lg);
      box-shadow: var(--sombra-alta);
      overflow: hidden;
      transform: perspective(1400px) rotateY(-9deg) rotateX(3deg);
    }

    .vista-previa__barra {
      display: flex;
      gap: 6px;
      padding: 12px 16px;
      background: var(--superficie-tenue);
      border-bottom: 1px solid var(--borde);
    }

    .vista-previa__barra span {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--borde-fuerte);
    }

    .vista-previa__cuerpo {
      padding: 18px;
    }

    .vista-previa__metricas {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }

    .vista-previa__metrica {
      padding: 12px;
      border: 1px solid var(--borde);
      border-radius: var(--radio-sm);
    }

    .vista-previa__lista {
      display: grid;
      gap: 12px;
    }

    .vista-previa__fila {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 11px 12px;
      border: 1px solid var(--borde);
      border-radius: var(--radio-sm);
    }

    .linea {
      height: 8px;
      background: var(--borde);
      border-radius: 4px;
    }

    .linea--corta {
      width: 60%;
    }

    .linea--media {
      flex: 1;
      max-width: 150px;
    }

    .linea--valor {
      width: 78%;
      height: 15px;
      margin-top: 8px;
      background: var(--marca-suave);
    }

    @media (max-width: 900px) {
      .portada {
        grid-template-columns: 1fr;
        gap: 40px;
        min-height: 0;
      }

      .vista-previa {
        order: -1;
      }

      .vista-previa__ventana {
        max-width: 360px;
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .boton-microsoft {
        transition: none;
      }

      .boton-microsoft:hover {
        transform: none;
      }
    }
  `
})
export class Inicio implements OnInit {

  protected readonly sesion = inject(SesionService);

  private readonly pedidosService = inject(PedidosService);

  private readonly authService = inject(MsalService);

  /* Filas de la vista previa decorativa de la portada. */
  protected readonly filasPrevias = [
    { id: 1, estado: 'Pendiente', clase: 'insignia--atencion' },
    { id: 2, estado: 'Entregado', clase: 'insignia--exito' },
    { id: 3, estado: 'Enviado', clase: 'insignia--marca' }
  ];

  protected readonly pedidos = signal<Pedido[]>([]);

  protected readonly cargando = signal(true);

  protected readonly primerNombre = computed(() =>
    this.sesion.nombre().split(/\s+/)[0] || 'de nuevo');

  protected readonly total = computed(() => this.pedidos().length);

  protected readonly pendientes = computed(() =>
    this.pedidos().filter((p) => p.estado === 'PENDIENTE').length);

  protected readonly entregados = computed(() =>
    this.pedidos().filter((p) => p.estado === 'ENTREGADO').length);

  protected readonly montoTotal = computed(() =>
    this.pedidos().reduce((suma, p) => suma + Number(p.monto), 0));

  protected readonly recientes = computed(() =>
    [...this.pedidos()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5));


  /**
   * Inicia el flujo Authorization Code + PKCE contra Microsoft Entra ID.
   * MSAL genera el code_verifier y redirige al proveedor de identidad.
   */
  iniciarSesion(): void {
    this.authService.loginRedirect(loginRequest);
  }


  ngOnInit(): void {
    if (!this.sesion.autenticado() || this.sesion.sinRoles()) {
      this.cargando.set(false);

      return;
    }

    this.pedidosService.listar().subscribe({
      next: (datos) => {
        this.pedidos.set(datos);
        this.cargando.set(false);
      },

      error: (error: HttpErrorResponse) => {
        console.error('No fue posible cargar el resumen:', error);
        this.cargando.set(false);
      }
    });
  }


  protected nombreEstado(estado: string): string {
    const nombres: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      PREPARANDO: 'Preparando',
      ENVIADO: 'Enviado',
      ENTREGADO: 'Entregado',
      CANCELADO: 'Cancelado'
    };

    return nombres[estado] ?? estado;
  }


  protected claseEstado(estado: string): string {
    const clases: Record<string, string> = {
      PENDIENTE: 'insignia--atencion',
      PREPARANDO: 'insignia--marca',
      ENVIADO: 'insignia--marca',
      ENTREGADO: 'insignia--exito',
      CANCELADO: 'insignia--peligro'
    };

    return clases[estado] ?? 'insignia--neutra';
  }
}
