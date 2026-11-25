# Publicar el frontend en Render

El frontend se despliega como **Web Service Node**, no como Static Site. Su servidor sirve React desde `dist/` y reenvía `/api/*` a la API .NET. Esto conserva los repositorios separados y evita modificar CORS o `Program.cs` en el backend.

## Antes de empezar

Publicar primero la API y su base siguiendo la [guía del backend](https://github.com/sebastianquisper-lab/Sky-Port-Manager/blob/main/RENDER.md). Para trabajar con datos reales, hay que importar la base original: el Blueprint de la API crea una base vacía.

## Usando el Blueprint incluido

1. En [Render](https://dashboard.render.com/), seleccionar **New → Blueprint**.
2. Conectar `johanvallejos-cyber/Sky-Port-Frontend`, rama `main`, archivo `render.yaml` en la raíz.
3. Introducir `API_PROXY_TARGET` con la URL HTTPS real que muestra Render para la API. Ejemplo: `https://skyport-api.onrender.com`. No añadir `/api`, credenciales ni parámetros.
4. Revisar el plan y confirmar la creación. El archivo selecciona el plan `free`.
5. Esperar a que el servicio esté activo y abrir la URL pública del frontend.

La URL de ejemplo no es una dirección ya desplegada; Render puede asignar otro nombre. No usar `localhost`, `127.0.0.1` ni el hostname privado de un servicio gratuito como destino en Render.

## Configuración manual equivalente

| Campo | Valor |
| --- | --- |
| Tipo | Web Service |
| Repositorio | `johanvallejos-cyber/Sky-Port-Frontend` |
| Rama | `main` |
| Runtime | Node |
| Root Directory | Vacío (raíz del repositorio) |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/healthz` |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `API_PROXY_TARGET` | URL pública HTTPS de la API, sin `/api` |

No utilizar `npm run dev` ni `npm run preview` como servidor de producción. No añadir reglas de redirección de `/api`: el servidor incluido reenvía las peticiones sin cambiar el origen que ve el navegador.

## Prueba final

- **Ver demostración** funciona sin consultar la API y utiliza datos ficticios.
- Para login real, utilizar una cuenta activa de la base importada. El frontend no crea cuentas.
- Tras ingresar, comprobar vuelos, búsqueda, filtros y detalle. **Limpiar filtros** incluye todas las fechas.
- Compartir con el profesor la URL pública del frontend; el enlace de GitHub muestra el código, no ejecuta la aplicación.

Un `/healthz` exitoso solo verifica el servidor del frontend, no la conexión a PostgreSQL. Un error 502 en login suele indicar URL de API incorrecta o backend no disponible. Los servicios gratuitos de Render pueden tardar en despertar; esperar y volver a intentar.

La sesión se conserva solo en memoria. Los secretos de PostgreSQL y JWT pertenecen exclusivamente al backend; no configurarlos en este frontend.

## Comprobar antes de subir

```powershell
npm ci
npm run test:production
npm run test:browser
```

La prueba de producción verifica archivos estáticos, JSON POST, JWT, rutas y parámetros, errores 401/502, descarga binaria y validación del destino del proxy. La prueba de navegador verifica la interacción completa con respuestas simuladas.

Referencias: [Web Services](https://render.com/docs/web-services), [Blueprints](https://render.com/docs/blueprint-spec), [límites gratuitos](https://render.com/docs/free).
