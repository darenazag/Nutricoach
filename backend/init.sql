BEGIN;

-- ======================================================================
-- 1. ELIMINAR TABLAS EXISTENTES (orden inverso a dependencias)
-- ======================================================================
DROP TABLE IF EXISTS public."Profile_Exercise" CASCADE;
DROP TABLE IF EXISTS public."Profile_MealPlan" CASCADE;
DROP TABLE IF EXISTS public."Goal" CASCADE;
DROP TABLE IF EXISTS public."WeightLog" CASCADE;
DROP TABLE IF EXISTS public."Exercise" CASCADE;
DROP TABLE IF EXISTS public."MealPlan" CASCADE;
DROP TABLE IF EXISTS public."Profile_Meal" CASCADE;
DROP TABLE IF EXISTS public."Meal_Food_item" CASCADE;
DROP TABLE IF EXISTS public."Food_item" CASCADE;
DROP TABLE IF EXISTS public."Meal" CASCADE;
DROP TABLE IF EXISTS public."Profile" CASCADE;
DROP TABLE IF EXISTS public."User" CASCADE;

-- ======================================================================
-- 2. CREAR TABLAS
-- ======================================================================

-- 2.1 User
CREATE TABLE IF NOT EXISTS public."User"
(
    user_id numeric NOT NULL,
    name character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(50) NOT NULL,
    PRIMARY KEY (user_id)
);

-- 2.2 Profile (FK → User)
CREATE TABLE IF NOT EXISTS public."Profile"
(
    user_id numeric NOT NULL,
    weight numeric NOT NULL,
    age numeric NOT NULL,
    height numeric NOT NULL,
    gender "char" NOT NULL,
    "activityFactor" "char" NOT NULL,
    "objective" "char" NOT NULL,
    "basalMetabolicRate" numeric NOT NULL,
    "totalDailyEnergyExpenditure" numeric NOT NULL,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES public."User" (user_id)
);

-- 2.3 Food_item
CREATE TABLE IF NOT EXISTS public."Food_item"
(
    food_id numeric NOT NULL,
    protein numeric NOT NULL,
    calories numeric NOT NULL,
    carbs numeric NOT NULL,
    fat numeric NOT NULL,
    source character varying NOT NULL,
    PRIMARY KEY (food_id)
);

-- 2.4 Meal
CREATE TABLE IF NOT EXISTS public."Meal"
(
    meal_id numeric NOT NULL,
    name character varying(100) NOT NULL, 
    calories numeric NOT NULL,
    protein numeric NOT NULL,
    fat numeric NOT NULL,
    carbs numeric NOT NULL,
    img character varying,
    source character varying,
    PRIMARY KEY (meal_id)
);

-- 2.5 Meal_Food_item (N:M entre Meal y Food_item)
CREATE TABLE IF NOT EXISTS public."Meal_Food_item"
(
    "Meal_meal_id" numeric NOT NULL,
    "Food_item_food_id" numeric NOT NULL,
    FOREIGN KEY ("Meal_meal_id") REFERENCES public."Meal" (meal_id),
    FOREIGN KEY ("Food_item_food_id") REFERENCES public."Food_item" (food_id)
);

-- 2.6 Profile_Meal (N:M entre Profile y Meal)
CREATE TABLE IF NOT EXISTS public."Profile_Meal"
(
    "Profile_user_id" numeric NOT NULL,
    "Meal_meal_id" numeric NOT NULL,
    FOREIGN KEY ("Profile_user_id") REFERENCES public."Profile" (user_id),
    FOREIGN KEY ("Meal_meal_id") REFERENCES public."Meal" (meal_id)
);

-- ======================================================================
-- NUEVAS TABLAS
-- ======================================================================

-- 2.7 WeightLog — registro histórico de peso (1:N con Profile)
CREATE TABLE IF NOT EXISTS public."WeightLog"
(
    log_id    SERIAL PRIMARY KEY,
    user_id   NUMERIC NOT NULL,
    weight    NUMERIC NOT NULL,
    date      DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES public."Profile" (user_id)
);

-- 2.8 MealPlan — plan de comidas por día de la semana
CREATE TABLE IF NOT EXISTS public."MealPlan"
(
    plan_id   SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    day_of_week INT NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
    meal_type VARCHAR(20) NOT NULL CHECK(meal_type IN ('desayuno','almuerzo','merienda','cena'))
);

-- 2.9 Profile_MealPlan (N:M entre Profile y MealPlan)
CREATE TABLE IF NOT EXISTS public."Profile_MealPlan"
(
    "Profile_user_id" NUMERIC NOT NULL,
    "MealPlan_plan_id" NUMERIC NOT NULL,
    FOREIGN KEY ("Profile_user_id") REFERENCES public."Profile" (user_id),
    FOREIGN KEY ("MealPlan_plan_id") REFERENCES public."MealPlan" (plan_id)
);

-- 2.10 Exercise — catálogo de ejercicios
CREATE TABLE IF NOT EXISTS public."Exercise"
(
    exercise_id SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    calories_per_hour NUMERIC NOT NULL
);

-- 2.11 Profile_Exercise — registro de actividad realizada (1:N con Profile y Exercise)
CREATE TABLE IF NOT EXISTS public."Profile_Exercise"
(
    log_id SERIAL PRIMARY KEY,
    "Profile_user_id" NUMERIC NOT NULL,
    "Exercise_exercise_id" NUMERIC NOT NULL,
    duration_min INT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    FOREIGN KEY ("Profile_user_id") REFERENCES public."Profile" (user_id),
    FOREIGN KEY ("Exercise_exercise_id") REFERENCES public."Exercise" (exercise_id)
);

-- 2.12 Goal — metas personalizadas del usuario (1:N con Profile)
CREATE TABLE IF NOT EXISTS public."Goal"
(
    goal_id    SERIAL PRIMARY KEY,
    user_id    NUMERIC NOT NULL,
    type       VARCHAR(30) NOT NULL CHECK(type IN ('weight','protein','water','calories','carbs','fat')),
    target     NUMERIC NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date   DATE,
    FOREIGN KEY (user_id) REFERENCES public."Profile" (user_id)
);

-- ======================================================================
-- 3. INSERTAR DATOS
-- ======================================================================

-- 3.1 Users
INSERT INTO public."User" (user_id, name, password, email) VALUES
(1, 'Carlos Entrenador', 'claveloca123', 'carlos@nutricoach.com'),
(2, 'Elena Runner',     'securepass99', 'elena@nutricoach.com'),
(3, 'Sofia Health',     'sofia2026',    'sofia@nutricoach.com');

-- 3.2 Profiles (Carlos, Elena, Sofía)
INSERT INTO public."Profile" (user_id, weight, age, height, gender, "activityFactor", "objective", "basalMetabolicRate", "totalDailyEnergyExpenditure") VALUES
(1, 80.5, 28, 180, 'M', 'A', 'G', 1800, 2800),
(2, 62.0, 32, 165, 'F', 'M', 'P', 1400, 2100),
(3, 70.0, 24, 172, 'F', 'S', 'M', 1500, 1850);

-- 3.3 Food_items
INSERT INTO public."Food_item" (food_id, protein, calories, carbs, fat, source) VALUES
(101, 23.0, 165, 0.0, 3.6,  'Pechuga de Pollo'),
(102, 2.7,  130, 28.0, 0.3, 'Arroz Integral'),
(103, 13.0, 155, 1.1, 11.0, 'Huevo Entero'),
(104, 2.0,  49,  12.0, 0.1, 'Avena en copos'),
(105, 0.9,  22,  3.9,  0.2, 'Brócoli Hervido'),
(106, 2.0,  160, 9.0,  15.0,'Aguacate');

-- 3.4 Meals
INSERT INTO public."Meal" (meal_id, name, calories, protein, fat, carbs, img, source) VALUES
(201, 'Pollo con Arroz y Brócoli Fit', 489, 51.6, 7.7,  59.9, 'pollo_arroz.jpg',  'Almuerzo limpio post-entreno'),
(202, 'Tortilla de Avena y Aguacate', 393, 21.0, 21.1, 33.1, 'tortilla_avena.jpg', 'Desayuno energético'),
(203, 'Bowl de Arroz, Huevo y Aguacate', 600, 31.4, 27.3, 66.1, 'bowl_healthy.jpg', 'Cena completa alta en grasas buenas');

-- 3.5 Meal_Food_item (ingredientes de cada comida)
INSERT INTO public."Meal_Food_item" ("Meal_meal_id", "Food_item_food_id") VALUES
(201, 101), (201, 102), (201, 105),
(202, 103), (202, 104), (202, 106),
(203, 102), (203, 103), (203, 106);

-- 3.6 Profile_Meal (comidas asignadas a usuarios)
INSERT INTO public."Profile_Meal" ("Profile_user_id", "Meal_meal_id") VALUES
(1, 201), (1, 203),
(2, 202),
(3, 201);

-- ======================================================================
-- NUEVOS DATOS
-- ======================================================================

-- 3.7 WeightLog (última semana)
INSERT INTO public."WeightLog" (user_id, weight, date) VALUES
(1, 80.5, '2026-05-18'), (1, 80.3, '2026-05-19'), (1, 80.0, '2026-05-20'),
(1, 80.4, '2026-05-21'), (1, 80.1, '2026-05-22'), (1, 79.8, '2026-05-23'), (1, 80.0, '2026-05-24'),
(2, 62.0, '2026-05-18'), (2, 61.7, '2026-05-19'), (2, 61.9, '2026-05-20'),
(2, 61.5, '2026-05-21'), (2, 61.6, '2026-05-22'), (2, 61.3, '2026-05-23'), (2, 61.4, '2026-05-24'),
(3, 70.0, '2026-05-18'), (3, 70.2, '2026-05-19'), (3, 70.1, '2026-05-20'),
(3, 70.5, '2026-05-21'), (3, 70.4, '2026-05-22'), (3, 70.7, '2026-05-23'), (3, 70.9, '2026-05-24');

-- 3.8 MealPlan (3 días de plan semanal)
INSERT INTO public."MealPlan" (plan_id, name, day_of_week, meal_type) VALUES
-- Lunes (1)
(1,  'Tortilla de Avena y Aguacate',       1, 'desayuno'),
(2,  'Pollo con Arroz y Brócoli Fit',      1, 'almuerzo'),
(3,  'Bowl de Arroz, Huevo y Aguacate',    1, 'cena'),
-- Miércoles (3)
(4,  'Tortilla de Avena y Aguacate',       3, 'desayuno'),
(5,  'Bowl de Arroz, Huevo y Aguacate',    3, 'almuerzo'),
(6,  'Pollo con Arroz y Brócoli Fit',      3, 'cena'),
-- Viernes (5)
(7,  'Bowl de Arroz, Huevo y Aguacate',    5, 'desayuno'),
(8,  'Tortilla de Avena y Aguacate',       5, 'almuerzo'),
(9,  'Pollo con Arroz y Brócoli Fit',      5, 'cena');

-- 3.9 Profile_MealPlan
INSERT INTO public."Profile_MealPlan" ("Profile_user_id", "MealPlan_plan_id") VALUES
(1, 1), (1, 2), (1, 3),  -- Carlos: Lunes completo
(1, 7), (1, 8), (1, 9),  -- Carlos: Viernes completo
(2, 4), (2, 5), (2, 6),  -- Elena: Miércoles completo
(3, 1), (3, 6);           -- Sofía: Desayuno lunes + cena miércoles

-- 3.10 Exercise (catálogo)
INSERT INTO public."Exercise" (exercise_id, name, calories_per_hour) VALUES
(1, 'Correr (8 km/h)',         480),
(2, 'Ciclismo (moderado)',     400),
(3, 'Natación',                500),
(4, 'Entrenamiento de fuerza', 350),
(5, 'Yoga',                    200),
(6, 'Caminar (5 km/h)',        220),
(7, 'HIIT',                    600),
(8, 'Elíptica',                450),
(9, 'Pilates',                 250),
(10, 'Boxeo',                  550);

-- 3.11 Profile_Exercise (actividad registrada)
INSERT INTO public."Profile_Exercise" ("Profile_user_id", "Exercise_exercise_id", duration_min, date) VALUES
(1, 4, 45, '2026-05-24'),  -- Carlos: fuerza 45min
(1, 1, 30, '2026-05-22'),  -- Carlos: correr 30min
(2, 2, 50, '2026-05-24'),  -- Elena: bici 50min
(2, 5, 40, '2026-05-23'),  -- Elena: yoga 40min
(3, 6, 35, '2026-05-24'),  -- Sofía: caminar 35min
(3, 9, 40, '2026-05-23');  -- Sofía: pilates 40min

-- 3.12 Goal (metas personalizadas)
INSERT INTO public."Goal" (user_id, type, target, start_date, end_date) VALUES
(1, 'weight',  78, '2026-05-01', '2026-08-01'),  -- Carlos: bajar a 78kg
(1, 'protein', 160, '2026-05-01', NULL),          -- Carlos: 160g proteína/día
(2, 'weight',  58, '2026-05-01', '2026-07-01'),  -- Elena: bajar a 58kg
(2, 'calories', 1800, '2026-05-01', NULL),        -- Elena: 1800 kcal/día
(3, 'weight',  73, '2026-05-01', '2026-09-01'),  -- Sofía: subir a 73kg
(3, 'protein', 100, '2026-05-01', NULL);          -- Sofía: 100g proteína/día

COMMIT;
