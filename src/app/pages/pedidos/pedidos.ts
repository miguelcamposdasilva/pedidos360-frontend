import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { SesionService } from '../../core/sesion.service';
import { PedidosService } from '../../core/pedidos.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { SiTieneRolDirective } from '../../core/si-tiene-rol.directive';
import { NuevoPedido, Pedido } from '../../core/pedido.model';
import { ROL_ADMIN } from '../../auth-config';


@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, DatePipe, SiTieneRolDirective],
  template: `
    <div class="encabezado-pagina">
      <div>
        <h1>Pedidos</h1>
        <p class="encabezado-pagina__texto">
          {{ pedidos().length }} registros en total
        </p>
      </div>

      <!--
        La directiva oculta el boton cuando el token no trae el rol.
        Es una decision de interfaz: el backend responde 403 igualmente.
      -->
      <button
        *siTieneRol="rolAdmin"
        type="button"
        class="boton boton--primario"
        (click)="abrirFormulario()">
        Nuevo pedido
      </button>
    </div>

    <section class="tarjeta">
      <header class="tarjeta__cabecera">
        <div class="barra-herramientas crecer">
          <input
            type="search"
            class="entrada crecer"
            placeholder="Buscar por cliente o descripcion"
            [ngModel]="busqueda()"
            (ngModelChange)="busqueda.set($event)" />

          <select
            class="entrada"
            style="width: auto"
            [ngModel]="filtroEstado()"
            (ngModelChange)="filtroEstado.set($event)">
            <option value="">Todos los estados</option>
            @for (estado of estados; track estado) {
              <option [value]="estado">{{ nombreEstado(estado) }}</option>
            }
          </select>
        </div>

        <button type="button" class="boton boton--fantasma" (click)="cargar()">
          Actualizar
        </button>
      </header>

      @if (cargando()) {
        <div class="tarjeta__cuerpo">
          @for (fila of [1, 2, 3, 4]; track fila) {
            <div class="esqueleto" style="margin-bottom: 16px"></div>
          }
        </div>
      } @else if (pedidos().length === 0) {
        <div class="estado-vacio">
          <div class="estado-vacio__icono">&#128230;</div>
          <p class="estado-vacio__titulo">Todavia no hay pedidos</p>
          <p class="estado-vacio__texto">
            Cuando se registre el primer pedido, aparecera en esta lista.
          </p>
        </div>
      } @else if (filtrados().length === 0) {
        <div class="estado-vacio">
          <div class="estado-vacio__icono">&#128269;</div>
          <p class="estado-vacio__titulo">Sin resultados</p>
          <p class="estado-vacio__texto">Prueba con otro texto o cambia el filtro.</p>
        </div>
      } @else {
        <div class="envoltorio-tabla">
          <table class="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Descripcion</th>
                <th>Estado</th>
                <th class="numerico">Monto</th>
                <th>Registrado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              @for (pedido of filtrados(); track pedido.id) {
                <tr>
                  <td class="celda-principal">{{ pedido.cliente }}</td>

                  <td class="celda-secundaria">{{ pedido.descripcion }}</td>

                  <td>
                    <span class="insignia" [class]="claseEstado(pedido.estado)">
                      <span class="punto"></span>
                      {{ nombreEstado(pedido.estado) }}
                    </span>
                  </td>

                  <td class="numerico">
                    {{ pedido.monto | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}
                  </td>

                  <td class="celda-secundaria">
                    {{ pedido.creadoEn | date: 'dd MMM, HH:mm' }}
                    <br />
                    <span class="texto-tenue">{{ pedido.creadoPor }}</span>
                  </td>

                  <td>
                    <button
                      *siTieneRol="rolAdmin"
                      type="button"
                      class="boton boton--peligro-texto"
                      (click)="eliminar(pedido)">
                      Eliminar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    @if (formularioAbierto()) {
      <div class="velo" (click)="cerrarFormulario()">
        <div class="modal" (click)="$event.stopPropagation()">
          <header class="modal__cabecera">
            <h2>Nuevo pedido</h2>

            <button
              type="button"
              class="boton boton--fantasma"
              aria-label="Cerrar"
              (click)="cerrarFormulario()">
              &times;
            </button>
          </header>

          <form (ngSubmit)="crear()">
            <div class="modal__cuerpo">
              <label class="campo">
                <span class="campo__etiqueta">Cliente</span>
                <input
                  type="text"
                  name="cliente"
                  class="entrada"
                  placeholder="Nombre del cliente"
                  required
                  [(ngModel)]="formulario.cliente" />
              </label>

              <label class="campo">
                <span class="campo__etiqueta">Descripcion</span>
                <input
                  type="text"
                  name="descripcion"
                  class="entrada"
                  placeholder="Detalle del pedido"
                  required
                  [(ngModel)]="formulario.descripcion" />
              </label>

              <label class="campo" style="margin-bottom: 0">
                <span class="campo__etiqueta">Monto</span>
                <input
                  type="number"
                  name="monto"
                  class="entrada"
                  placeholder="0"
                  min="1"
                  required
                  [(ngModel)]="formulario.monto" />
              </label>
            </div>

            <footer class="modal__pie">
              <button
                type="button"
                class="boton boton--neutro"
                (click)="cerrarFormulario()">
                Cancelar
              </button>

              <button
                type="submit"
                class="boton boton--primario"
                [disabled]="guardando() || !formularioValido()">
                {{ guardando() ? 'Guardando...' : 'Registrar pedido' }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    }
  `
})
export class Pedidos implements OnInit {

  private readonly pedidosService = inject(PedidosService);

  private readonly notificaciones = inject(NotificacionesService);

  protected readonly sesion = inject(SesionService);

  protected readonly rolAdmin = ROL_ADMIN;

  protected readonly estados = [
    'PENDIENTE',
    'PREPARANDO',
    'ENVIADO',
    'ENTREGADO',
    'CANCELADO'
  ];

  protected readonly pedidos = signal<Pedido[]>([]);

  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  protected readonly formularioAbierto = signal(false);

  protected readonly busqueda = signal('');

  protected readonly filtroEstado = signal('');

  protected formulario: NuevoPedido = this.formularioVacio();


  protected readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.pedidos()
      .filter((pedido) => !estado || pedido.estado === estado)
      .filter((pedido) =>
        !texto ||
        pedido.cliente.toLowerCase().includes(texto) ||
        pedido.descripcion.toLowerCase().includes(texto))
      .sort((a, b) => b.id - a.id);
  });


  ngOnInit(): void {
    this.cargar();
  }


  cargar(): void {
    this.cargando.set(true);

    this.pedidosService.listar().subscribe({
      next: (datos) => {
        this.pedidos.set(datos);
        this.cargando.set(false);
      },

      error: (error: HttpErrorResponse) => {
        this.notificaciones.desdeError(error, 'cargar los pedidos');
        this.cargando.set(false);
      }
    });
  }


  crear(): void {
    if (!this.formularioValido()) {
      return;
    }

    this.guardando.set(true);

    this.pedidosService.crear(this.formulario).subscribe({
      next: (creado) => {
        this.pedidos.update((actuales) => [...actuales, creado]);

        this.notificaciones.exito(
          `Pedido de ${creado.cliente} registrado correctamente.`);

        this.guardando.set(false);
        this.cerrarFormulario();
      },

      error: (error: HttpErrorResponse) => {
        this.notificaciones.desdeError(error, 'crear pedidos');
        this.guardando.set(false);
      }
    });
  }


  eliminar(pedido: Pedido): void {
    this.pedidosService.eliminar(pedido.id).subscribe({
      next: () => {
        this.pedidos.update((actuales) =>
          actuales.filter((actual) => actual.id !== pedido.id));

        this.notificaciones.exito('Pedido eliminado.');
      },

      error: (error: HttpErrorResponse) =>
        this.notificaciones.desdeError(error, 'eliminar pedidos')
    });
  }


  abrirFormulario(): void {
    this.formulario = this.formularioVacio();
    this.formularioAbierto.set(true);
  }


  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }


  protected formularioValido(): boolean {
    return (
      this.formulario.cliente.trim().length > 0 &&
      this.formulario.descripcion.trim().length > 0 &&
      Number(this.formulario.monto) > 0
    );
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


  private formularioVacio(): NuevoPedido {
    return { cliente: '', descripcion: '', monto: 0 };
  }
}
