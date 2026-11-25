# SkyPort Frontend

Interfaz independiente para SkyPort Manager, desarrollada con React, TypeScript y Vite. Este proyecto tiene su propia carpeta, dependencias e historial de Git. No requiere modificar archivos de la API .NET.

## Ejecutar

Requiere Node.js 22.12+ (o Node.js 24 LTS).

```powershell
cd C:\Users\johan\RiderProjects\Sky-Port-Frontend
npm ci
npm run dev
```

Abrir **http://127.0.0.1:5173**. La opción **Ver demostración** funciona sin la API y usa datos ficticios.

Para iniciar sesión con una cuenta real, ejecutar también el backend en otra terminal:

```powershell
cd C:\Users\johan\RiderProjects\Sky-Port-Manager
dotnet run --project Sky.API --launch-profile https
```

El backend debe contar con su configuración habitual y su base PostgreSQL. Usar una cuenta activa existente; este frontend no crea usuarios ni cambia permisos.

## Conexión con la API

El navegador consulta `/api` en el mismo origen del frontend. El servidor de desarrollo Vite reenvía esas peticiones a `https://localhost:7248`, con el JWT cuando corresponde. Esto permite desarrollar sin cambiar CORS ni `Program.cs` en el backend.

Si la API usa otra dirección, copiar `.env.example` a `.env.local`, configurar `API_PROXY_TARGET` y reiniciar Vite. Este valor solo lo utiliza el proxy; no contiene credenciales.

La validación del certificado autofirmado se omite únicamente en el proxy de desarrollo local. La sesión y su token se conservan en memoria; al recargar hay que iniciar sesión nuevamente. La aplicación cierra la sesión al vencer el token o recibir HTTP 401.

Endpoints utilizados:

- `POST /api/auth/login`
- `GET /api/flight-board`
- `GET /api/flight-occupancy`

## Funcionalidad

- Login, visibilidad de contraseña y cierre de sesión.
- Panel con vuelos del día, salidas, retrasos y ocupación ponderada por capacidad disponible.
- Tablero de vuelos, búsqueda por vuelo/aerolínea/aeropuerto y filtros por fecha y estado.
- Detalle de horarios, puertas y capacidad. Horarios en la zona local del navegador.
- Estados de carga, listas vacías y errores. La última consulta exitosa se mantiene si falla una actualización.
- Diseño adaptable a escritorio y móvil. La tabla permite desplazamiento horizontal en pantallas pequeñas.

El filtro inicial muestra las salidas de hoy; **Limpiar filtros** permite consultar todas las fechas. Esta primera versión es de consulta: no incluye creación ni edición de vuelos.

## Verificación

```powershell
npm run build
npm run test:browser
```

La prueba de navegador usa Microsoft Edge instalado y una API simulada en un puerto temporal. Comprueba también las solicitudes a través del proxy real de Vite, sin usar credenciales ni modificar la base de datos. Para otro navegador Chromium instalado, configurar `BROWSER_CHANNEL` (por ejemplo, `chrome`). Las capturas quedan en `artifacts/`, que no se versiona.

## Publicación independiente

`npm run build` genera `dist/`. `npm run preview` permite revisar el resultado estático en `http://127.0.0.1:4173`; no incluye el proxy de desarrollo ni conexión a la API.

Para publicar con datos reales, el hosting del frontend debe reenviar `/api/*` al backend mediante un proxy inverso. El proxy de Vite solo funciona en desarrollo y no se incluye en `dist/`. Esta configuración se realiza en el hosting, sin añadir el frontend al proyecto .NET.
