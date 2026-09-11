import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { apiBaseUrl } from '../auth-config';
import { NuevoPedido, Pedido } from './pedido.model';


/**
 * Cliente del microservicio pedidos-service.
 *
 * No agrega el header Authorization manualmente: el MsalInterceptor lo
 * inyecta porque la URL coincide con el protectedResourceMap declarado
 * en app.config.ts.
 */
@Injectable({ providedIn: 'root' })
export class PedidosService {

  private readonly http = inject(HttpClient);

  private readonly url = `${apiBaseUrl}/api/pedidos`;


  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.url);
  }


  crear(pedido: NuevoPedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.url, pedido);
  }


  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }


  /** Endpoint publico del backend: sirve para comprobar conectividad y CORS. */
  ping(): Observable<Record<string, string>> {
    return this.http.get<Record<string, string>>(`${apiBaseUrl}/api/publico/ping`);
  }
}
