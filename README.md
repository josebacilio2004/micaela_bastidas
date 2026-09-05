# MERCADO DE ABASTOS MICAELA BASTIDAS
## Sistema Integral de Gestión de Pagos, Padrón, Servicios Higiénicos y Rendiciones Contables

Plataforma empresarial de grado de producción diseñada para reemplazar los cuadernos físicos de cobro en el **Mercado de Abastos Micaela Bastidas**, garantizando trazabilidad financiera absoluta, prevención de duplicidad, sincronización offline-first y gobierno de datos.

---

## 1. Arquitectura General

```text
 INTERNET
    │
    ▼
┌──────────────┐
│    NGINX     │  (Reverse Proxy / Gzip / Rate Limit)
│ Puerto 80/443│
└──────┬───────┘
       │
  ┌────┴────────────────────────┐
  │                             │
  ▼                             ▼
┌────────────────┐     ┌─────────────────┐
│    NEXT.JS     │     │     BACKEND     │
│  Sistema Web   │────▶│  NestJS / Node  │
│  Docker :3001  │     │   Docker :3000  │
└────────────────┘     └────────┬────────┘
                                │ Prisma ORM
                                ▼
                       ┌─────────────────┐
                       │   POSTGRESQL    │ (Privada, sin acceso a Internet)
                       │     Docker      │ (Volumen persistente: postgres_data)
                       └─────────────────┘
                                ▲
                                │ HTTPS REST API
                       ┌────────┴────────┐
                       │     FLUTTER     │
                       │   APP ANDROID   │ (SQLite Offline-First + Idempotency)
                       └─────────────────┘
```

> **Regla de Aislamiento**: PostgreSQL está confinado exclusivamente dentro de la red privada `micaela_bastidas_network`. Ni Flutter ni Next.js se conectan directamente a la base de datos; la única fuente de verdad para reglas financieras es el Backend NestJS.

---

## 2. Stack Tecnológico

- **Backend**: Node.js, NestJS, TypeScript, Prisma ORM, Swagger/OpenAPI, Passport JWT & Refresh Tokens, Decimal.js para precisión monetaria, ExcelJS, Jest.
- **Web**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Móvil (Android)**: Flutter 3.41, Dart, Dio, SQLite (sqflite) Offline Queue, Connectivity Plus, Idempotency Keys (UUID v4).
- **Infraestructura**: Docker Compose, PostgreSQL 16 Alpine, Nginx Alpine, Scripts Bash/PowerShell para backups.

---

## 3. Puesta en Marcha en Un Solo Comando

Para iniciar todo el entorno de servidor:

```bash
# 1. Copiar archivo de entorno
cp .env.example .env

# 2. Iniciar todos los contenedores dockerizados
docker compose up -d --build
```

### Migraciones y Datos de Prueba (Seed):
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

---

## 4. Usuarios y Credenciales Iniciales

Contraseña común para todos los usuarios de prueba: **`Micaela2026!`**

| Usuario | Rol | Módulos Autorizados |
| :--- | :--- | :--- |
| **`admin`** | ADMINISTRADOR | Acceso completo, reabrir cajas, anular cobros, tarifas, usuarios, auditoría. |
| **`tesorera`** | TESORERA | Padrón, cobro de Alcabala y Agua, apertura y cierre de caja, reportes. |
| **`sshh_operador`** | SERVICIOS_HIGIENICOS | Conteo rápido miccionarios/retretes, tickets y cierre de turno. |
| **`consulta`** | CONSULTA | Visualización de reportes, estadísticas y padrón (solo lectura). |

---

## 5. Endpoints Principales

- **Web Administrativa**: http://localhost (a través de Nginx) o http://localhost:3001
- **Swagger OpenAPI**: http://localhost/api/docs o http://localhost:3000/api/docs
- **Healthcheck**: http://localhost/api/health
- **Exportación Excel XLSX**: `GET /api/exports/excel`
- **Exportación CSV**: `GET /api/exports/csv`

---

## 6. Tarifas Iniciales Configuradas

- **Alcabala**:
  - Socio Titular: **S/ 10.00** mensual.
  - Ambulante Fijo: **S/ 3.00** diario.
  - Ambulante Temporal: **S/ 3.00** diario.
- **Agua Potable**:
  - Socio Titular: **S/ 6.00** mensual.
  - Ambulante Fijo: **S/ 3.00** mensual.
- **Servicios Higiénicos**:
  - Miccionario: **S/ 0.50** por uso.
  - Retrete / Inodoro: **S/ 1.00** por uso.

---

## 7. Ejecución de la Aplicación Móvil (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

---

## 8. Backups y Restauración

- **Backup en Linux/Servidor**: `./scripts/backup.sh`
- **Backup en Windows**: `.\scripts\backup.ps1`
- **Restaurar**: `./scripts/restore.sh ./backups/micaela_backup_XXXXX.sql.gz`

---

## 9. Pruebas Automatizadas

- Backend: `cd backend && npm test`
- Web: `cd web && npm run build`
- Móvil: `cd mobile && flutter test`
