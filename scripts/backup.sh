#!/usr/bin/env bash
# ============================================================
# Backup Script for Mercado de Abastos Micaela Bastidas (PostgreSQL)
# ============================================================
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/micaela_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Iniciando backup de la base de datos Micaela Bastidas..."
docker compose exec -T postgres pg_dump -U micaela_admin -d micaela_bastidas -F c | gzip > "${BACKUP_FILE}"

echo "[SUCCESS] Backup completado exitosamente: ${BACKUP_FILE}"
echo "[INFO] Tamaño del backup: $(du -sh "${BACKUP_FILE}" | cut -f1)"
