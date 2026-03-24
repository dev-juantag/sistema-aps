# Sistema SGA/APS - Unificación de Salud Territorial 🚀

Este es un sistema integral de gestión de atenciones médicas (SGA) e identificación de población en territorio (APS), diseñado para operar bajo un esquema multitenencia (multi-tenant) basado en territorios específicos.

El sistema unifica dos flujos críticos:
1.  **Identificaciones (APS):** Captura de Ficha Hogar, georreferenciación y censo demográfico por parte de Auxiliares de campo.
2.  **Atenciones (SGA):** Registro de consultas médicas y seguimiento de pacientes por parte de Profesionales de salud.

## 🧠 Características Principales

-   **Multi-tenant por Territorio:** Los datos se filtran automáticamente por el territorio asignado al usuario.
-   **RBAC (Control de Acceso Basado en Roles):**
    -   `SUPER_ADMIN / ADMIN`: Gestión global, reportes consolidados y monitoreo de facturación.
    -   `AUXILIAR`: Gestión de identificaciones y fichas hogar en su territorio.
    -   `PROFESIONAL`: Gestión de atenciones médicas y derivaciones asignadas.
-   **Registro Unificado (Gold Standard):** El sistema cruza automáticamente los datos de identificación con el historial médico del paciente (Attendances).
-   **Seguridad:** Autenticación robusta con Supabase Auth y validación de sesiones vía Middleware de Next.js.
-   **Facturación:** Trazabilidad de cada atención médica con indicador de estado (Pendiente, Facturada, etc.).
-   **Dashboard Dinámico:** KPIs en tiempo real, gráficas de gestión territorial y historial de actividad reciente.
-   **Exportación:** Generación de reportes y fichas de identificación en formato PDF profesional de un solo clic.

## 🛠️ Stack Tecnológico

-   **Framework:** Next.js 15 (App Router)
-   **Lenguaje:** TypeScript
-   **Base de Datos:** PostgreSQL a través de Supabase
-   **ORM:** Prisma
-   **Estilos:** TailwindCSS
-   **Validación:** Zod + React Hook Form
-   **Estado:** SWR (con caché optimizada para fluidez)

## 📁 Estructura del Proyecto

```text
/src
├── app
│   ├── api          # Endpoints de login, usuarios, atenciones, IDs
│   ├── dashboard   # SPA del sistema principal
├── components       # Componentes de UI, Wizard de identificación, Charts
├── lib              # Prisma Client, Contextos de Auth, Validaciones Zod
├── prisma           # Schema.prisma y migraciones
├── utils            # Formateadores, cálculos de edad y lógica común
```

## 🚀 Instalación y Configuración

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/USER_GITHUB/sistema-aps.git
    cd sistema-aps
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la raíz con:
    ```env
    DATABASE_URL="tu-url-de-supabase-postgresql"
    DIRECT_URL="tu-url-directa-db"
    NEXT_PUBLIC_SUPABASE_URL="tu-supabase-url"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
    NEXT_PUBLIC_SITE_URL="http://localhost:3000"
    ```

4.  **Sincronizar DB:**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Correr en Desarrollo:**
    ```bash
    npm run dev
    ```

## 🛡️ Entidades de Calidad

El sistema garantiza la **integridad referencial** mediante el uso de transacciones de Prisma, evitando la duplicidad de datos demográficos y asegurando que cada atención esté ligada a un ciudadano identificado previamente en el territorio.

---
**Desarrollado como Arquitectura de Microservicios para la gestión de salud pública.**
