#!/usr/bin/env bash
# ============================================================
# Restore Script for Mercado de Abastos Micaela Bastidas (PostgreSQL)
# ============================================================
set -e

if [ -z "$1" ]; then
  echo "Uso: ./scripts/restore.sh <archivo_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "[ERROR] El archivo de backup no existe: $BACKUP_FILE"
  exit 1
fi

echo "[WARNING] Este proceso restaurará la base de datos reemplazando datos existentes."
read -p "¿Desea continuar? (s/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  echo "Operación cancelada."
  exit 0
fi

echo "[INFO] Restaurando base de datos desde ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker compose exec -T postgres pg_restore -U micaela_admin -d micaela_bastidas --clean --if-exists

echo "[SUCCESS] Base de datos restaurada correctamente."
