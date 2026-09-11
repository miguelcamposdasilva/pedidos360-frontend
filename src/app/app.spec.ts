import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { NotificacionesService } from './core/notificaciones.service';

import { requiereRol } from './core/rol.guard';
import { ROL_ADMIN, ROL_LECTOR, apiScope, loginRequest } from './auth-config';
import { msalInterceptorConfigFactory } from './app.config';


describe('Configuracion de autenticacion', () => {

  it('solicita los scopes de OpenID Connect y el de la API', () => {
    expect(loginRequest.scopes).toContain('openid');
    expect(loginRequest.scopes).toContain('profile');
    expect(loginRequest.scopes).toContain(apiScope);
  });

  it('protege las llamadas a la API con el scope delegado', () => {
    const configuracion = msalInterceptorConfigFactory();

    const entradas = Array.from(configuracion.protectedResourceMap.entries());

    expect(entradas.length).toBe(1);

    const [url, scopes] = entradas[0];

    expect(url).toContain('/api/*');
    expect(scopes).toEqual([apiScope]);
  });

  it('expone los roles con el mismo valor que valida el backend', () => {
    expect(ROL_ADMIN).toBe('Pedidos.Admin');
    expect(ROL_LECTOR).toBe('Pedidos.Lector');
  });

  it('construye un guard de rol invocable', () => {
    TestBed.configureTestingModule({});

    expect(typeof requiereRol(ROL_ADMIN)).toBe('function');
  });
});


describe('Traduccion de errores a lenguaje de usuario', () => {

  let servicio: NotificacionesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(NotificacionesService);
  });

  function ultimoTexto(): string {
    const lista = servicio.lista();

    return lista[lista.length - 1].texto;
  }

  it('un 403 explica la falta de permisos sin mostrar el codigo', () => {
    servicio.desdeError(
      new HttpErrorResponse({ status: 403 }), 'crear pedidos');

    expect(ultimoTexto()).toBe('No tienes permisos para crear pedidos.');
    expect(ultimoTexto()).not.toContain('403');
  });

  it('un 401 invita a iniciar sesion de nuevo', () => {
    servicio.desdeError(
      new HttpErrorResponse({ status: 401 }), 'cargar los pedidos');

    expect(ultimoTexto()).toContain('sesion expiro');
  });

  it('un fallo de red no se confunde con un problema de permisos', () => {
    servicio.desdeError(
      new HttpErrorResponse({ status: 0 }), 'cargar los pedidos');

    expect(ultimoTexto()).toContain('conexion');
  });
});
