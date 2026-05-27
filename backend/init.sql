-- ============================================================
-- init.sql — Esquema seguro e idempotente (solo CREATE IF NOT EXISTS)
-- Seguro de ejecutar en cualquier momento: no destruye datos.
-- Para un reset completo usa reset.sql.
-- ============================================================

BEGIN;

-- 1. User (tabla raíz)
CREATE TABLE IF NOT EXISTS public."User"
(
    user_id  SERIAL           NOT NULL,
    name     varchar(50)      NOT NULL,
    password varchar(255)     NOT NULL,
    email    varchar(50)      NOT NULL UNIQUE,
    PRIMARY KEY (user_id)
);

-- 2. Profile (FK → User)
CREATE TABLE IF NOT EXISTS public."Profile"
(
    user_id                       integer  NOT NULL,
    weight                        numeric  NOT NULL,
    age                           integer  NOT NULL,
    height                        numeric  NOT NULL,
    gender                        "char"   NOT NULL,   -- 'M' | 'F'
    "activityFactor"              "char"   NOT NULL,   -- 'S' | 'L' | 'A' | 'V'
    "objective"                   "char"   NOT NULL,   -- 'P' | 'M' | 'G'
    "basalMetabolicRate"          numeric  NOT NULL,
    "totalDailyEnergyExpenditure" numeric  NOT NULL,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES public."User" (user_id) ON DELETE CASCADE
);

-- 3. Food_item (SERIAL + campo name explícito)
CREATE TABLE IF NOT EXISTS public."Food_item"
(
    food_id  SERIAL              NOT NULL,
    name     varchar(100)        NOT NULL UNIQUE,
    protein  numeric             NOT NULL,
    calories numeric             NOT NULL,
    carbs    numeric             NOT NULL,
    fat      numeric             NOT NULL,
    source   character varying   NOT NULL,
    PRIMARY KEY (food_id)
);

-- 4. Meal (SERIAL + unique en nombre)
CREATE TABLE IF NOT EXISTS public."Meal"
(
    meal_id  SERIAL              NOT NULL,
    name     varchar(100)        NOT NULL UNIQUE,
    calories numeric             NOT NULL,
    protein  numeric             NOT NULL,
    fat      numeric             NOT NULL,
    carbs    numeric             NOT NULL,
    img      character varying,
    source   character varying,
    PRIMARY KEY (meal_id)
);

-- 5. Meal_Food_item — PK compuesta (evita duplicados a nivel DB)
CREATE TABLE IF NOT EXISTS public."Meal_Food_item"
(
    "Meal_meal_id"       integer NOT NULL,
    "Food_item_food_id"  integer NOT NULL,
    PRIMARY KEY ("Meal_meal_id", "Food_item_food_id"),
    FOREIGN KEY ("Meal_meal_id")      REFERENCES public."Meal"      (meal_id)  ON DELETE CASCADE,
    FOREIGN KEY ("Food_item_food_id") REFERENCES public."Food_item" (food_id)  ON DELETE CASCADE
);

-- 6. Profile_Meal — PK compuesta + timestamp para racha real
CREATE TABLE IF NOT EXISTS public."Profile_Meal"
(
    "Profile_user_id"  integer     NOT NULL,
    "Meal_meal_id"     integer     NOT NULL,
    assigned_at        timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("Profile_user_id", "Meal_meal_id"),
    FOREIGN KEY ("Profile_user_id") REFERENCES public."Profile" (user_id) ON DELETE CASCADE,
    FOREIGN KEY ("Meal_meal_id")    REFERENCES public."Meal"    (meal_id) ON DELETE CASCADE
);

COMMIT;
