# AnalyticsEstratego — Software de Diagnóstico Comercial

Software de diagnóstico comercial premium que analiza el embudo de ventas de un negocio, calcula pérdidas, proyecta un escenario optimizado, calcula el ROI en tiempo real, genera propuestas comerciales personalizadas utilizando Inteligencia Artificial (OpenAI) y automatiza el envío de propuestas por correo electrónico.

Este repositorio contiene tanto el frontend (React + Vite) como el backend (Node.js + Express), configurados para desarrollo local y producción usando Docker y despliegues modernos (por ejemplo, EasyPanel, VPS o Docker Engine nativo).

---

## 🚀 Stack Tecnológico

El proyecto está construido bajo una arquitectura cliente-servidor desacoplada:

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- **Estilos:** [Tailwind CSS v3](https://tailwindcss.com/) / v4 (utiliza `@tailwindcss/vite` para procesamiento de estilos rápido).
- **Enrutamiento:** [React Router v7](https://reactrouter.com/)
- **Visualización de Datos / Gráficos:** [Recharts v3](https://recharts.org/) (gráficos interactivos del embudo de ventas y comparativas).
- **Generación de Reportes PDF:** [jsPDF](https://github.com/parallax/jsPDF) y [html2canvas](https://html2canvas.hertzen.com/) para capturar y exportar los resultados visuales de diagnósticos a PDF.
- **Cliente HTTP:** [Axios](https://axios-http.com/) para la comunicación con la API.

### Backend
- **Entorno de Ejecución:** [Node.js v20+](https://nodejs.org/) (configurado nativamente con ES Modules: `"type": "module"`).
- **Framework Web:** [Express v4](https://expressjs.com/)
- **Base de Datos:** [PostgreSQL v16](https://www.postgresql.org/) (mediante cliente `pg` con Pool de conexiones optimizado).
- **Autenticación y Seguridad:** [JSON Web Tokens (JWT)](https://jwt.io/) para sesiones seguras y [bcryptjs](https://github.com/dcodeIO/bcrypt.js) para hashing de contraseñas.
- **Validación de Datos:** [Zod](https://zod.dev/) para esquemas rigurosos de validación en rutas de entrada.
- **Inteligencia Artificial:** [OpenAI SDK v6](https://github.com/openai/openai-node) utilizando el modelo `gpt-4o-mini` para redactar las propuestas de consultoría comercial.
- **Correo Electrónico:** [Nodemailer](https://nodemailer.com/) para el envío automatizado de las propuestas comerciales y credenciales a clientes/vendedores.
- **Generación de PDFs en Servidor:** [PDFKit](https://pdfkit.org/) preparado para generación directa.

### Infraestructura y Desarrollo Local
- **Contenedores:** [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) para levantar PostgreSQL y pgAdmin.
- **Gestión de Base de Datos:** [pgAdmin 4](https://www.pgadmin.org/) precargado y conectado localmente.

---

## 📁 Estructura del Proyecto

```text
AnalyticsEstratego/
├── backend/                  # API Rest y servicios Node.js
│   ├── db/                   # Esquema SQL inicial y scripts de base de datos
│   │   └── schema.sql        # Esquema completo de tablas, índices y triggers
│   ├── src/
│   │   ├── config/           # Configuración de base de datos (PostgreSQL Pool)
│   │   ├── middleware/       # Autenticación, control de roles y validación Zod
│   │   ├── routes/           # Definición de rutas API (auth, vendedores, clientes, diagnósticos)
│   │   ├── scripts/          # Scripts utilitarios (ej. semilla para el Super Admin)
│   │   ├── services/         # Lógica de negocio (cálculo de diagnóstico, OpenAI, correos, etc.)
│   │   └── server.js         # Punto de entrada de la aplicación Express
│   ├── Dockerfile            # Construcción de la imagen de producción para el backend
│   └── package.json
│
├── frontend/                 # Interfaz de usuario (React)
│   ├── public/               # Activos públicos estáticos
│   ├── src/
│   │   ├── components/       # Componentes de UI (Formularios, Tablas, Gráficos)
│   │   ├── pages/            # Vistas principales del flujo (Login, Dashboard, Diagnóstico)
│   │   ├── services/         # Cliente Axios (`api.js`) y endpoints
│   │   └── index.css         # Configuración y estilos globales de Tailwind
│   ├── Dockerfile            # Imagen multi-stage (Build de Vite + Nginx para servir estáticos)
│   ├── nginx.conf            # Configuración del servidor Nginx (manejador de SPA)
│   └── package.json
│
├── docs/                     # Documentación externa
│   └── Estratego.pdf         # Metodología y especificaciones del diagnóstico
│
└── docker-compose.yml        # Orquestación local de base de datos (Postgres + pgAdmin)
```

---

## ⚙️ Variables de Entorno

### Backend (`backend/.env`)
Crea un archivo `.env` en la carpeta `backend` basado en [.env.example](file:///c:/Users/kevin/Documentos/Github/AnalyticsEstratego/backend/.env.example):

```ini
PORT=3001
NODE_ENV=development

# Base de Datos (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=estratego
DB_PASSWORD=estratego_dev_2026
DB_NAME=analytics_estratego

# Orígenes Permitidos (CORS)
CORS_ORIGIN=http://localhost:5173

# Autenticación (JWT)
JWT_SECRET=tu-secreto-super-seguro-y-largo
JWT_EXPIRES_IN=12h

# Datos del Administrador Inicial (Semilla/Seed)
SUPER_ADMIN_EMAIL=go@estratego.us
SUPER_ADMIN_PASSWORD=password_seguro_aqui
SUPER_ADMIN_NOMBRE=Super Admin

# Configuración del Servidor de Correo (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=tu-correo@gmail.com
SMTP_PASSWORD=tu-app-password-de-gmail
EMAIL_FROM="AnalyticsEstratego <tu-correo@gmail.com>"
EMAIL_REPLY_TO=go@estratego.us

# Integración con Inteligencia Artificial (OpenAI)
OPENAI_API_KEY=sk-proj-tu-api-key
OPENAI_MODEL=gpt-4o-mini

# URL del Frontend para enlaces generados por el backend
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env` - Opcional en desarrollo)
En desarrollo local, Vite redirige las peticiones `/api` al backend usando el proxy configurado en [vite.config.js](file:///c:/Users/kevin/Documentos/Github/AnalyticsEstratego/frontend/vite.config.js). 

En producción, puedes definir la variable:
- `VITE_API_URL`: Dirección pública de la API de backend (ej. `https://api.sales.estratego.us`). Si se deja vacía, por defecto usará `/api` relativo al dominio actual.

---

## 🛠️ Configuración e Instalación Local

Sigue estos pasos para arrancar el entorno de desarrollo en tu máquina local:

### 1. Prerrequisitos
- Node.js v20 o superior instalado.
- Docker y Docker Desktop activos.

### 2. Levantar la Base de Datos y pgAdmin
Desde la raíz del proyecto ejecuta:
```bash
docker compose up -d
```
Esto levantará:
- **PostgreSQL** en el puerto `5432` con las credenciales indicadas en `docker-compose.yml`.
- **pgAdmin 4** en el puerto `5050` (Usuario: `go@estratego.us`, Contraseña: `admin`), configurado en modo servidor único para fácil exploración de datos.

### 3. Crear el Esquema en la Base de Datos
1. Conéctate a Postgres mediante pgAdmin o cualquier cliente SQL (ej. DBeaver).
2. Crea una base de datos llamada `analytics_estratego` (si no se creó automáticamente).
3. Ejecuta el archivo de esquema completo: [schema.sql](file:///c:/Users/kevin/Documentos/Github/AnalyticsEstratego/backend/db/schema.sql) para estructurar las tablas, índices y triggers.
   > ⚠️ **Advertencia:** El archivo `schema.sql` contiene sentencias `DROP TABLE IF EXISTS ... CASCADE`. Solo ejecútalo en entornos de desarrollo o cuando desees inicializar por completo la base de datos.

### 4. Inicializar y Arrancar el Backend
1. Navega al directorio backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Ejecuta el script de siembra de datos para crear el usuario Super Admin inicial (usa las credenciales indicadas en tu `.env`):
   ```bash
   npm run seed
   ```
4. Inicia el servidor en modo desarrollo (utiliza `--watch` nativo de Node.js):
   ```bash
   npm run dev
   ```
   La API estará lista y escuchando en `http://localhost:3001`. Puedes verificar la salud de la API y de la conexión a la base de datos visitando: `http://localhost:3001/api/health`.

### 5. Inicializar y Arrancar el Frontend
1. Abre una nueva terminal en la raíz y navega al directorio frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Arranca el entorno de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   La interfaz de usuario estará disponible en `http://localhost:5173`.

---

## 🗄️ Diseño de la Base de Datos (Esquema)

La base de datos PostgreSQL consta de las siguientes entidades principales:

### Roles de Usuario (`rol_usuario`)
- `super_admin`: Acceso total. Gestión de vendedores, configuración global, visualización de métricas generales y diagnósticos.
- `vendedor`: Puede crear clientes, realizar diagnósticos a clientes asignados y descargar los reportes PDF.
- `cliente`: Rol con permisos de lectura para visualizar sus propios diagnósticos e histórico comercial.

### Tabla `usuarios`
- Contiene a todos los actores del sistema diferenciados por la columna `rol`.
- Cuenta con un campo `creado_por` auto-referenciado para auditar qué vendedor o administrador registró a cada cliente/usuario.
- Incluye índices en `email` y `rol` para búsquedas óptimas en inicios de sesión y filtrado.

### Tabla `diagnosticos`
- Relaciona un diagnóstico con su respectivo `cliente_id` (referencia obligatoria a `usuarios`) y el `vendedor_id` (quien realizó la asesoría).
- Los datos numéricos del embudo y porcentajes de conversión se almacenan en 4 bloques de formato flexible utilizando tipos de datos **`JSONB`** (`bloque_a`, `bloque_b`, `bloque_c`, `bloque_d`). Esto permite adaptabilidad a futuro sin alterar la estructura física de la base de datos.
- Almacena el resultado financiero calculado en la clave `resultados` (tipo `JSONB`).
- Contiene campos para la `propuesta_generada` por la Inteligencia Artificial y la `propuesta_acordada` redactada manualmente.
- `estado` (`borrador` o `completado`) gestionado mediante ENUM.

### Triggers e Integridad
- Trigger `set_actualizado_en()` en ambas tablas principales para autogestionar el campo de fecha `actualizado_en` ante cualquier actualización.

---

## 🚢 Plan de Despliegue en Producción

El proyecto está dockerizado por completo y listo para despliegues en servidores en la nube (VPS) o plataformas PaaS como EasyPanel, Coolify, Heroku o Railway.

### Despliegue de Frontend (SPA)
El [Dockerfile del frontend](file:///c:/Users/kevin/Documentos/Github/AnalyticsEstratego/frontend/Dockerfile) utiliza un build multi-stage:
1. **Fase de Compilación:** Compila la aplicación React utilizando Node y Vite, inyectando la variable de entorno `VITE_API_URL` como build argument.
2. **Fase de Servidor:** Copia los archivos estáticos resultantes a una imagen ligera de **Nginx** y expone el puerto `80`.
3. **Manejo de rutas SPA:** La configuración personalizada [nginx.conf](file:///c:/Users/kevin/Documentos/Github/AnalyticsEstratego/frontend/nginx.conf) asegura que cualquier ruta secundaria de React Router sea redirigida a `index.html` sin lanzar errores 404.

### Despliegue de Backend (API)
El [Dockerfile del backend](file:///c:/Users/kevin/Documentos/Github/AnalyticsEstratego/backend/Dockerfile):
1. Instala únicamente las dependencias de producción (`npm ci --omit=dev`).
2. Expone el puerto `3001` y arranca la API.

### Despliegue Usando EasyPanel o Similares
1. **Base de Datos:** Crea un servicio de base de datos PostgreSQL estándar en tu panel. Crea la base de datos `analytics_estratego`.
2. **Backend:** 
   - Configura un servicio de tipo App apuntando a la subcarpeta `backend`.
   - Agrega todas las variables del `.env` de producción como Variables de Entorno del servicio.
   - Conecta la base de datos usando las credenciales internas de la red del panel (ej. `postgres:5432`).
3. **Frontend:**
   - Configura un servicio de tipo App apuntando a la subcarpeta `frontend`.
   - Añade una variable en el Build (Build Args): `VITE_API_URL=https://api.tudominio.com`.
   - EasyPanel compilará los estáticos con esa URL apuntando a tu backend de producción y lo servirá eficientemente con Nginx.

---

## 📝 Notas para el Desarrollador (Handover)

1. **Cálculos Comerciales:** Toda la lógica matemática para evaluar las pérdidas del embudo de ventas, estimar la optimización del proceso y proyectar el Retorno de Inversión (ROI) está encapsulada en el servicio de backend [calculo.service.js](file:///c:/Users/kevin/Documentos/Github/AnalyticsEstratego/backend/src/services/calculo.service.js). Si se requiere modificar el algoritmo matemático, se debe centralizar allí.
2. **Integración con OpenAI:** Las llamadas al LLM están optimizadas con prompts estructurados para garantizar respuestas formateadas y legibles en la propuesta comercial. Asegúrate de monitorear los tokens de uso en la cuenta de OpenAI.
3. **Seguridad en CORS:** En producción, es de vital importancia reemplazar `CORS_ORIGIN=*` o localhost por los dominios específicos en producción (por ejemplo: `https://sales.estratego.us,https://admin.estratego.us`) para evitar accesos no autorizados a la API.
4. **Respaldo de la BD:** En producción, asegúrate de configurar un cronjob o herramienta del servidor para respaldar el volumen de PostgreSQL de forma periódica (`pg_dump`).

