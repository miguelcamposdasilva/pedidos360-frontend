# pedidos360-frontend

Aplicación Angular para la gestión de pedidos, con autenticación **OAuth 2.0 /
OpenID Connect** contra **Microsoft Entra ID** mediante **MSAL** y el flujo
**Authorization Code con PKCE**.

Es el frontend del proyecto **Pedidos360**, de la asignatura Desarrollo Cloud
Native I. Consume el microservicio
[`pedidos-service`](../pedidos360-backend) a través de AWS API Gateway:

```
Angular + MSAL (Authorization Code + PKCE)
        ↓  Bearer JWT
AWS API Gateway  (valida firma, issuer, audience, vigencia · CORS)
        ↓
Spring Boot en EC2  (revalida el JWT · autoriza por roles)
        ↓
PostgreSQL en AWS RDS
```

---

## Stack

| Componente | Versión |
|---|---|
| Angular | 21 (standalone, signals, control flow `@if` / `@for`) |
| `@azure/msal-angular` | 6.x |
| `@azure/msal-browser` | 5.x |
| TypeScript | 5.9 |
| Vitest | 4.x |

## Estructura

```
src/app/
├── auth-config.ts              tenant, clientIds, scopes, URL de la API, roles
├── app.config.ts               providers: MSAL, guard, interceptor, HttpClient
├── app.routes.ts               rutas y guards
├── app.ts / app.html / app.css  shell: barra, navegación, menú de usuario
├── core/
│   ├── claims.service.ts        obtiene el access token y decodifica sus claims
│   ├── claims.model.ts
│   ├── sesion.service.ts        claims → modelo de vista (nombre, iniciales, rol)
│   ├── rol.guard.ts             guard de autorización por rol
│   ├── si-tiene-rol.directive.ts  *siTieneRol="'Pedidos.Admin'"
│   ├── pedidos.service.ts       cliente HTTP del microservicio
│   ├── pedido.model.ts
│   ├── notificaciones.service.ts  avisos flotantes y traducción de errores HTTP
│   ├── notificaciones.ts          componente de los avisos
│   └── registro-http.service.ts   bitácora de peticiones (interceptor de lectura)
└── pages/
    ├── inicio/        portada de acceso y panel de resumen
    ├── pedidos/       listado, búsqueda, filtros y alta en modal
    ├── diagnostico/   claims del token y bitácora de llamadas
    └── sin-acceso/    destino cuando falta el rol
```

---

## Ejecutar

**Requisitos:** Node 20+, npm.

```bash
npm install
npm start           # http://localhost:4200
```

```bash
npm test            # Vitest
npm run build       # compilación de producción en dist/
```

---

## Autenticación

### Authorization Code con PKCE

MSAL Browser v5 usa **siempre** Authorization Code + PKCE para aplicaciones
SPA: no hay nada que configurar, pero sí que demostrar. Con DevTools abierto
y *Preserve log* activado, al iniciar sesión se observa:

- en `/oauth2/v2.0/authorize`: `code_challenge` y `code_challenge_method=S256`
- en `/oauth2/v2.0/token`: `code_verifier`, y **ningún** `client_secret`

Un SPA es un cliente público y no puede custodiar secretos; PKCE reemplaza al
`client_secret` con un desafío criptográfico de un solo uso.

### Inicialización y estado de sesión

`app.config.ts` llama a `instance.initialize()` desde `provideAppInitializer`,
de modo que MSAL está listo antes de que el guard o el interceptor se ejecuten.
El componente raíz llama a `handleRedirectObservable()`, que intercambia el
código de autorización por los tokens al volver del login.

El estado de sesión se deriva de la **cuenta activa de MSAL**, no de haber
obtenido el access token de la API. La diferencia importa: si esa petición
falla —por ejemplo con el backend caído— la aplicación seguiría mostrando al
usuario como autenticado, en lugar de devolverlo a la pantalla de acceso.

### Guards

```ts
{
  path: 'pedidos',
  canActivate: [MsalGuard, requiereRol(ROL_ADMIN, ROL_LECTOR)],
  ...
}
```

| Guard | Responsabilidad |
|---|---|
| `MsalGuard` | **autenticación**: si no hay sesión, dispara el login por redirección |
| `requiereRol(...)` | **autorización**: comprueba que el token traiga alguno de los roles; si no, redirige a `/sin-acceso` |

| Ruta | Protección |
|---|---|
| `/` | pública (portada de acceso o panel según haya sesión) |
| `/pedidos` | `MsalGuard` + `Pedidos.Admin` o `Pedidos.Lector` |
| `/diagnostico` | `MsalGuard` |
| `/sin-acceso` | pública |

El guard de rol es **experiencia de usuario**, no seguridad: evita mostrar una
pantalla que terminaría en `403`. La autorización vinculante la aplica Spring
Security en el backend.

### MsalInterceptor

Configurado en `app.config.ts` con un `protectedResourceMap`:

```ts
protectedResourceMap.set(`${apiBaseUrl}/api/*`, [apiScope]);
```

A toda petición que coincida con ese patrón se le adjunta automáticamente un
`Authorization: Bearer <token>`. Las URLs que no están en el mapa viajan sin
token, que es lo correcto: nunca debe enviarse el token de la API a un tercero.

`pedidos.service.ts` nunca construye la cabecera a mano.

> `provideHttpClient(withInterceptorsFromDi())` es obligatorio: `MsalInterceptor`
> es un interceptor basado en clases, no funcional.

### Lectura de roles y scopes

Los App Roles (`Pedidos.Admin`, `Pedidos.Lector`) están definidos en la app
registration de **la API**, no en la del frontend. Por eso **no aparecen en el
`id_token`**: viajan en el `access_token` cuya audiencia es la API.

`claims.service.ts` obtiene ese token con `acquireTokenSilent` y decodifica su
payload para exponer `roles`, `scopes`, `issuer`, `audience` y vigencia como
signals. Es información de presentación: la decisión de seguridad la toma el
backend, que valida firma, issuer, audience y expiración.

`sesion.service.ts` traduce esos claims a un modelo de vista — `Pedidos.Admin`
se muestra como **«Administrador»**, nunca el valor técnico.

---

## Pantallas

**Inicio.** Sin sesión, una portada con el botón *Iniciar sesión con Microsoft*
y una nota que anticipa la redirección al proveedor de identidad. Con sesión,
un panel con métricas (total, pendientes, entregados, monto acumulado) y los
últimos pedidos.

**Pedidos.** Listado con búsqueda por cliente o descripción, filtro por estado,
estados como insignias de color y alta en un modal. El botón *Nuevo pedido* y
la acción *Eliminar* solo existen para administradores:

```html
<button *siTieneRol="rolAdmin">Nuevo pedido</button>
```

**Detalles técnicos** (`/diagnostico`). Deliberadamente fuera del menú
principal, accesible desde el menú de usuario o el pie. Muestra el contenido
del token —issuer, audience, tenant, roles, scopes, `iat`/`exp`— y una bitácora
de las últimas llamadas al microservicio con su código de respuesta real:

```
23:04:11  POST  /api/pedidos       Requerido   403 Sin permisos
23:04:02  GET   /api/pedidos       Requerido   200 OK
23:03:58  GET   /api/publico/ping  Público     200 OK
```

La alimenta un interceptor funcional de **solo lectura** que no modifica la
petición ni interfiere con `MsalInterceptor`.

**Sin acceso.** Destino del guard de rol cuando la cuenta carece de permisos.

### Errores

Los códigos HTTP no se muestran al usuario. `notificaciones.service.ts` los
traduce a lenguaje llano y los presenta como avisos flotantes:

| Código | Mensaje |
|---|---|
| `0` | «No hay conexión con el servidor…» |
| `401` | «Tu sesión expiró. Vuelve a iniciar sesión.» |
| `403` | «No tienes permisos para crear pedidos.» |

El código crudo queda registrado en la pantalla de diagnóstico. Hay pruebas que
verifican que el número **no** aparezca en el mensaje.

---

## Configuración

Todo en [`src/app/auth-config.ts`](src/app/auth-config.ts):

| Constante | Valor |
|---|---|
| `tenantId` | `320402ca-6827-4630-8167-c2bf3d2a6991` |
| `frontendClientId` | `470a6457-ce66-4860-91f5-ee4e6618e57c` |
| `apiClientId` | `323d4ae1-4cd7-4f3b-a10d-6cecd530b09d` |
| `apiScope` | `api://<apiClientId>/access_as_user` |
| `apiBaseUrl` | la *Invoke URL* del API Gateway |
| `ROL_ADMIN` / `ROL_LECTOR` | `Pedidos.Admin` / `Pedidos.Lector` |

Estos identificadores **no son secretos**: viajan en la URL del navegador
durante el login. El proyecto no contiene ni puede contener un `client_secret`.

Los valores de `ROL_ADMIN` y `ROL_LECTOR` deben coincidir exactamente con el
campo *Value* de los App Roles en Entra ID y con las reglas de `SecurityConfig`
en el backend.

### Cambiar de entorno

Una sola línea; el `protectedResourceMap` deriva de la misma constante y se
actualiza solo:

```ts
export const apiBaseUrl = 'https://<id>.execute-api.us-east-1.amazonaws.com';
```

> **Sin barra final.** La clave del mapa se arma como `${apiBaseUrl}/api/*`;
> una barra de más produce `//api/*`, el patrón deja de coincidir, el
> interceptor no adjunta el token y todo responde `401` sin motivo aparente.

El origen del frontend debe estar declarado en la configuración CORS del API
Gateway, y el `Authorization` entre las cabeceras permitidas.

### Requisitos en Entra ID

En la app registration del frontend:

- *Authentication* → plataforma **SPA** con `http://localhost:4200`
  (Entra solo acepta `http` para `localhost`; cualquier otro origen requiere
  HTTPS).
- *API permissions* → permiso delegado `access_as_user` de la API, con
  consentimiento otorgado.

---

## Pruebas

```bash
npm test
```

Cubren la configuración de autenticación (scopes solicitados, patrón del
`protectedResourceMap`, valores de los roles) y la traducción de errores HTTP a
mensajes de usuario.

---

## Resultados verificados

Recorrido completo contra la infraestructura desplegada en AWS:

| Escenario | Resultado | Quién decide |
|---|---|---|
| Login con Microsoft | token con `iss` v2.0, `aud` de la API y `roles` | Entra ID |
| Panel y listado con `Pedidos.Admin` | `200`, datos desde RDS | el microservicio |
| Crear pedido con `Pedidos.Admin` | `201` y fila persistida en RDS | el microservicio |
| Crear pedido con `Pedidos.Lector` | `403`, aviso «no tienes permisos» | Spring Security |
| Cuenta sin ningún rol | redirección a `/sin-acceso` | guard de rol |
| Petición sin token | `401` | API Gateway |

El `403` nace en Spring y el `401` en el gateway: el authorizer valida
identidad, pero no conoce los roles de la aplicación.

---

## Estado

| Requisito | Estado |
|---|---|
| MSAL integrado con Microsoft Entra ID | ✅ |
| Login y logout con OAuth 2.0 / OIDC | ✅ |
| Authorization Code con PKCE | ✅ |
| Rutas protegidas con guards | ✅ |
| `MsalInterceptor` adjunta el JWT | ✅ |
| Lectura de roles y scopes de los claims | ✅ |
| Consumo a través de AWS API Gateway | ✅ |
| Despliegue del SPA en la nube | no realizado |

El SPA se ejecuta en el entorno de desarrollo y consume la infraestructura
cloud real: API Gateway, EC2 y RDS. Publicarlo requeriría HTTPS mediante
S3 + CloudFront, ya que Entra ID solo acepta `http` para `localhost`.
