#!/bin/bash
# compile_schema.sh
# Combines all base schemas and patches into a single initialization file.
# This file will be mounted to /docker-entrypoint-initdb.d/init-scripts/ in the postgres container.

set -e

OUTPUT_DIR=".supabase-docker/volumes/db"
OUTPUT_FILE="$OUTPUT_DIR/00-schedulelab-schema.sql"

echo "Compiling ScheduleLab Database Schema..."

# Create directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Clear existing contents
> "$OUTPUT_FILE"

# Add header
echo "-- ==================================================" >> "$OUTPUT_FILE"
echo "-- ScheduleLab Init Schema" >> "$OUTPUT_FILE"
echo "-- Auto-generated on $(date)" >> "$OUTPUT_FILE"
echo "-- ==================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# List of files in execution order
FILES=(
    "update_schema.sql"          # Base
    "create_admin.sql"           # Admin setup fn
    "patch_rbac_new.sql"         # RBAC
    "patch_rbac_new2.sql"        # RBAC tweaks
    "patch-assets.sql"           # Asset tracking
    "patch-dockets.sql"          # Dockets updates
    "patch_billing.sql"          # Billing tables
    "patch_user_management.sql"  # Auth integration
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Appending $file..."
        echo "-- SOURCE FILE: $file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "-- ----------- END OF $file ----------- --" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    else
        echo "WARNING: File $file not found! Skipping..."
    fi
done

echo "Schema compilation complete: $OUTPUT_FILE"
