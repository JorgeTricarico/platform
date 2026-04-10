-- ============================================================
-- MIGRACIÓN: damian → mg_masajes
-- Ejecutar en Supabase > SQL Editor
-- Fecha: 2026-04-10
-- ============================================================

-- 1. RENOMBRAR TABLA
-- Operación O(1), no mueve datos, preserva columnas e índices
ALTER TABLE damian_finances RENAME TO mg_masajes_finances;

-- 2. RENOMBRAR ÍNDICE (si existe)
DO $$
DECLARE
  idx_name TEXT;
BEGIN
  SELECT indexname INTO idx_name
  FROM pg_indexes
  WHERE tablename = 'damian_finances'
     OR tablename = 'mg_masajes_finances'
  LIMIT 1;

  IF idx_name LIKE 'damian_%' THEN
    EXECUTE 'ALTER INDEX ' || quote_ident(idx_name) || ' RENAME TO ' ||
            quote_ident(replace(idx_name, 'damian_', 'mg_masajes_'));
  END IF;
END $$;

-- 3. ACTUALIZAR DATOS: columna business en todas las tablas
UPDATE users        SET business = 'mg_masajes' WHERE business = 'damian';
UPDATE clients      SET business = 'mg_masajes' WHERE business = 'damian';
UPDATE chat_messages SET business = 'mg_masajes' WHERE business = 'damian';

-- 4. VERIFICACIÓN FINAL
SELECT 'users'         AS tabla, business, COUNT(*) FROM users        GROUP BY business
UNION ALL
SELECT 'clients'       AS tabla, business, COUNT(*) FROM clients      GROUP BY business
UNION ALL
SELECT 'chat_messages' AS tabla, business, COUNT(*) FROM chat_messages GROUP BY business
UNION ALL
SELECT 'mg_masajes_finances' AS tabla, 'total' AS business, COUNT(*) FROM mg_masajes_finances;
