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

### Paso 4: Inicializar la Base de Datos y Cargar el Padrón Oficial de 107 Socios

Una vez que los contenedores estén corriendo, ejecuta la sincronización del esquema y el script de semilla oficial.

> [!IMPORTANT]
> El script `seed.js` realiza una **limpieza total previa** de la base de datos (eliminando de forma segura registros de prueba anteriores en orden estricto de dependencias) y carga automáticamente el **padrón oficial de los 107 socios** extraído de `SOCIOS_ORDEN_ALFABETICO.txt`.

**1. Sincronizar el esquema de la base de datos:**
```bash
docker exec micaela_backend npx prisma db push
```

**2. Ejecutar la limpieza y carga de datos oficiales:**
```bash
docker exec micaela_backend node dist/prisma/seed.js
```

#### ¿Qué datos se cargan automáticamente?
- **Padrón Oficial**: 107 socios (102 Socios Regulares + 5 Socios en Prueba con sus DNI, nombres y apellidos exactos).
- **Puestos del Mercado**: 120 puestos (`P-001` al `P-120`). Los puestos `P-001` a `P-107` quedan asignados a sus respectivos socios; `P-108` a `P-120` quedan libres.
- **Códigos QR de Carnet**: Generados para cada socio con formato `MB-QR-{DNI}`.
- **Conceptos y Tarifas**: Alcabala diaria/mensual, Agua, Sisa, Alquiler de servicios higiénicos y Cuotas extraordinarias.
- **Obligaciones de Pago**: Se generan las obligaciones del mes actual (Setiembre 2026: Alcabala S/ 10.00 y Agua S/ 6.00) listas para ser cobradas en Caja o mediante la App Móvil.
- **Sectores y Giros**: Frutas, Verduras, Carnes, Abarrotes, Comidas, etc.
- **Usuario Administrador**: Cuenta principal con permisos totales.

---

### Paso 5: Verificar el Acceso al Sistema Web

Abre tu navegador web (Google Chrome o Microsoft Edge) e ingresa a:

👉 **`http://localhost`** (o a la IP local de la computadora en la red del mercado, ej. `http://192.168.1.50`).

#### Credenciales Iniciales de Acceso:
- **Usuario:** `admin`
- **Contraseña:** `Micaela2026!`
- **Rol:** `ADMINISTRADOR` (Acceso completo a Padrón, Caja, Carnets QR, Faenas, Fondo Rotatorio, Asambleas, Documentos, Cámaras y Publicidad).

---

### Paso 6: Configuración y Uso en la Computadora

1. **Cámaras de Seguridad CCTV (`/camaras`)**:
   - Conecta las cámaras web o capturadoras USB a la computadora.
   - En el menú lateral, ingresa a **Cámaras de Seguridad**.
   - Haz clic en **Activar Cámara Local (USB/Webcam)** y autoriza el permiso en el navegador.
   - Selecciona la cuadrícula deseada (1x1, 2x2, 3x3 o 4x4) y captura instantáneas con marca de agua.
2. **Impresoras Térmicas POS (58mm / 80mm)**:
   - Conecta la ticketera por USB o Bluetooth a la computadora.
   - Los formatos de impresión térmica están calibrados para emisión inmediata de tickets y vouchers.
3. **Padrón y Carnets QR**:
   - Puedes subir las fotos oficiales y recibos de luz y agua en PDF desde la opción **Padrón**.
   - Para imprimir todas las credenciales de un sector para plastificar, ve a **Puestos y Espacios** -> **Imprimir Carnets QR por Sector (A4)** con foto y QR incluidos.

---

### Paso 7: Aplicación Móvil para Cobradores (Flutter)

La aplicación móvil en la carpeta `mobile/` se sincroniza con el sistema web:
1. **Configuración de IP**: En la pantalla de inicio o ajustes de la app móvil, ingresa la IP local de la computadora del mercado (ej. `http://192.168.1.50/api`).
2. **Padrón en la App**: Permite buscar socios, inquilinos y ambulantes, escanear carnets QR con la cámara del celular, y emitir cobros de sisa o cuotas offline/online.

---

### Comandos Útiles de Mantenimiento y Actualización

Si el sistema ya está instalado en la máquina del mercado y solo necesitas descargar los últimos cambios y cargar el nuevo padrón:

```bash
# 1. Descargar las últimas actualizaciones
git pull origin master

# 2. Reconstruir el backend con el nuevo código y seed
docker compose build backend
docker compose up -d

# 3. Aplicar cambios a la base de datos y cargar los 107 socios
docker exec micaela_backend npx prisma db push
docker exec micaela_backend node dist/prisma/seed.js
```

- **Ver estado de los servicios:** `docker compose ps`
- **Ver logs en tiempo real:** `docker compose logs -f`
- **Detener el sistema:** `docker compose down`
- **Reiniciar el sistema:** `docker compose restart`
