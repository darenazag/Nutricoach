-- ============================================================
-- reset.sql — DESTRUYE y recrea el esquema desde cero.
-- ¡PELIGROSO! Elimina TODOS los datos. Solo para desarrollo.
-- Uso: npm run db:reset
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS public."Profile_Meal"    CASCADE;
DROP TABLE IF EXISTS public."Meal_Food_item"  CASCADE;
DROP TABLE IF EXISTS public."Food_item"       CASCADE;
DROP TABLE IF EXISTS public."Meal"            CASCADE;
DROP TABLE IF EXISTS public."Profile"         CASCADE;
DROP TABLE IF EXISTS public."User"            CASCADE;

COMMIT;

\i init.sql
