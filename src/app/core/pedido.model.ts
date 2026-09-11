export type EstadoPedido =
  | 'PENDIENTE'
  | 'PREPARANDO'
  | 'ENVIADO'
  | 'ENTREGADO'
  | 'CANCELADO';


export interface Pedido {
  id: number;
  cliente: string;
  descripcion: string;
  monto: number;
  estado: EstadoPedido;
  creadoPor: string;
  creadoEn: string;
}


export interface NuevoPedido {
  cliente: string;
  descripcion: string;
  monto: number;
}
