# Guia de Instalacion y Despliegue en la Computadora del Mercado
## Mercado de Abastos Micaela Bastidas

Esta guia describe los pasos necesarios para instalar y poner en marcha el sistema completo en la maquina fisica del Mercado Micaela Bastidas.

---

### Requisitos Previos en la Computadora

1. **Sistema Operativo**: Windows 10/11 (64-bit) o Linux (Ubuntu 20.04/22.04 LTS).
2. **Git**: Descargar e instalar Git desde https://git-scm.com/
3. **Docker Desktop** (en Windows) o **Docker Engine + Docker Compose** (en Linux):
   - Asegurate de que Docker este iniciado y funcionando.
   - En Windows, activa WSL2 en Docker Desktop.
4. **Puertos Libres**:
   - Puerto `80` (HTTP) y `443` (HTTPS) para el proxy Nginx.
   - Si tienes Skype, IIS o Apache usando el puerto 80, detenlos antes de iniciar.

---

### Paso 1: Clonar el Repositorio

Abre la terminal (**PowerShell** o **Git Bash**) y ejecuta:

```bash
git clone https://github.com/josebacilio2004/micaela_bastidas.git
cd micaela_bastidas
```

---

### Paso 2: Configurar las Variables de Entorno

Copia el archivo de ejemplo para crear tu archivo `.env`:

**En Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**En Linux / Mac / Git Bash:**
```bash
cp .env.example .env
```

*Nota: El archivo `.env.example` ya viene preconfigurado para produccion local con Nginx en el puerto `80` y la ruta `/api` directa.*

---

### Paso 3: Construir e Iniciar los Contenedores con Docker

Ejecuta el siguiente comando para compilar las imagenes e iniciar los 4 servicios en segundo plano (`postgres`, `backend`, `web`, `nginx`):

```bash
docker compose up -d --build
```

---

### Paso 4: Inicializar la Base de Datos (Tablas y Datos Iniciales)

Una vez que los contenedores esten corriendo, ejecuta las migraciones de Prisma y la semilla con los usuarios iniciales, puestos y conceptos:

**1. Sincronizar las tablas:**
```bash
docker exec micaela_backend npx prisma db push
```

**2. Cargar datos iniciales (Roles, Administrador, Sectores, Puestos y Conceptos de Cobranza):**
```bash
docker exec micaela_backend node dist/prisma/seed.js
```

---

### Paso 5: Verificar el Acceso al Sistema

Abre tu navegador web (Google Chrome o Microsoft Edge) e ingresa a:

👉 **`http://localhost`** (o a la IP local de la computadora en la red del mercado, ej. `http://192.168.1.50`).

#### Credenciales Iniciales de Acceso:
- **Usuario:** `admin`
- **Contraseña:** `Micaela2026!`
- **Rol:** `ADMINISTRADOR` (Acceso completo a Padron, Caja, Camaras, Asambleas, Personal y Reportes).

---

### Paso 6: Configuracion y Uso en la Computadora

1. **Camaras de Seguridad CCTV (`/camaras`)**:
   - Conecta las camaras web o capturadoras USB a la computadora.
   - En el menu lateral, ingresa a **Camaras de Seguridad**.
   - Haz clic en **Activar Camara Local (USB/Webcam)** y autoriza el permiso en el navegador.
   - Selecciona la cuadricula deseada (1x1, 2x2, 3x3 o 4x4) y captura instantaneas con marca de agua.
2. **Impresoras Termicas POS (58mm / 80mm)**:
   - Conecta la ticketera por USB o Bluetooth a la computadora.
   - Los formatos de impresion termica estan calibrados para emision inmediata de tickets y vouchers.
3. **Padron y Carnets QR**:
   - Puedes subir las fotos oficiales y recibos de luz y agua en PDF desde la opcion **Padron**.
   - Para imprimir todas las credenciales de un sector para plastificar, ve a **Puestos y Espacios** -> **Imprimir Carnets QR por Sector (A4)**.

---

### Comandos Utiles de Mantenimiento

- **Ver estado de los servicios:** `docker compose ps`
- **Ver logs en tiempo real:** `docker compose logs -f`
- **Detener el sistema:** `docker compose down`
- **Reiniciar el sistema:** `docker compose restart`
- **Actualizar el sistema en el futuro:**
  ```bash
  git pull origin master
  docker compose up -d --build
  ```
