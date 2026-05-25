BEGIN;


DROP TABLE IF EXISTS public."Profile_Meal" CASCADE;
DROP TABLE IF EXISTS public."Meal_Food_item" CASCADE;
DROP TABLE IF EXISTS public."Food_item" CASCADE;
DROP TABLE IF EXISTS public."Meal" CASCADE;
DROP TABLE IF EXISTS public."Profile" CASCADE;
DROP TABLE IF EXISTS public."User" CASCADE;

CREATE TABLE IF NOT EXISTS public."User"
(
    user_id numeric NOT NULL,
    name character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(50) NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public."Profile"
(
    user_id numeric NOT NULL,
    weight numeric NOT NULL,
    age numeric NOT NULL,
    height numeric NOT NULL,
    gender "char" NOT NULL,              -- 'M' / 'F'
    "activityFactor" "char" NOT NULL,    -- 'S' (Sedentario), 'A' (Activo), etc.
    "objective" "char" NOT NULL,         -- 'P' (Perder), 'M' (Mantener), 'G' (Ganar)
    "basalMetabolicRate" numeric NOT NULL,
    "totalDailyEnergyExpenditure" numeric NOT NULL,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES public."User" (user_id)
);

CREATE TABLE IF NOT EXISTS public."Meal"
(
    meal_id numeric NOT NULL,
    name character varying(100) NOT NULL, -- Corregido de "char" a varchar para que quepa el nombre
    calories numeric NOT NULL,
    protein numeric NOT NULL,
    fat numeric NOT NULL,
    carbs numeric NOT NULL,
    img character varying,
    source character varying,
    PRIMARY KEY (meal_id)
);

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

CREATE TABLE IF NOT EXISTS public."Meal_Food_item"
(
    "Meal_meal_id" numeric NOT NULL,
    "Food_item_food_id" numeric NOT NULL,
    FOREIGN KEY ("Meal_meal_id") REFERENCES public."Meal" (meal_id),
    FOREIGN KEY ("Food_item_food_id") REFERENCES public."Food_item" (food_id)
);

CREATE TABLE IF NOT EXISTS public."Profile_Meal"
(
    "Profile_user_id" numeric NOT NULL,
    "Meal_meal_id" numeric NOT NULL,
    FOREIGN KEY ("Profile_user_id") REFERENCES public."Profile" (user_id),
    FOREIGN KEY ("Meal_meal_id") REFERENCES public."Meal" (meal_id)
);



-- Usuarios
INSERT INTO public."User" (user_id, name, password, email) VALUES
(1, 'Carlos Entrenador', 'claveloca123', 'carlos@nutricoach.com'),
(2, 'Elena Runner', 'securepass99', 'elena@nutricoach.com'),
(3, 'Sofia Health', 'sofia2026', 'sofia@nutricoach.com');

-- Perfiles: Carlos (Volumen), Elena (Definición), Sofía (Mantenimiento)
INSERT INTO public."Profile" (user_id, weight, age, height, gender, "activityFactor", "objective", "basalMetabolicRate", "totalDailyEnergyExpenditure") VALUES
(1, 80.5, 28, 180, 'M', 'A', 'G', 1800, 2800), -- Activo, Objetivo: Ganar masa
(2, 62.0, 32, 165, 'F', 'M', 'P', 1400, 2100), -- Moderado, Objetivo: Perder grasa
(3, 70.0, 24, 172, 'F', 'S', 'M', 1500, 1850); -- Sedentario, Objetivo: Mantener

-- Alimentos base (por porción estándar, ej: 100g)
-- food_id, protein, calories, carbs, fat, source
INSERT INTO public."Food_item" (food_id, protein, calories, carbs, fat, source) VALUES
(101, 23.0, 165, 0.0, 3.6, 'Pechuga de Pollo'),
(102, 2.7, 130, 28.0, 0.3, 'Arroz Integral'),
(103, 13.0, 155, 1.1, 11.0, 'Huevo Entero'),
(104, 2.0, 49, 12.0, 0.1, 'Avena en copos'),
(105, 0.9, 22, 3.9, 0.2, 'Brócoli Hervido'),
(106, 2.0, 160, 9.0, 15.0, 'Aguacate');

-- Platos / Comidas preparadas (Macros totales calculados)
-- meal_id, name, calories, protein, fat, carbs, img, source
INSERT INTO public."Meal" (meal_id, name, calories, protein, fat, carbs, img, source) VALUES
(201, 'Pollo con Arroz y Brócoli Fit', 489, 51.6, 7.7, 59.9, 'pollo_arroz.jpg', 'Almuerzo limpio post-entreno'),
(202, 'Tortilla de Avena y Aguacate', 393, 21.0, 21.1, 33.1, 'tortilla_avena.jpg', 'Desayuno energético energético'),
(203, 'Bowl de Arroz, Huevo y Aguacate', 600, 31.4, 27.3, 66.1, 'bowl_healthy.jpg', 'Cena completa alta en grasas buenas');

-- Relación de ingredientes que componen cada comida (Meal_Food_item)
INSERT INTO public."Meal_Food_item" ("Meal_meal_id", "Food_item_food_id") VALUES
(201, 101), -- Pollo con Arroz lleva: Pollo
(201, 102), -- Pollo con Arroz lleva: Arroz
(201, 105), -- Pollo con Arroz lleva: Brócoli
(202, 103), -- Tortilla lleva: Huevo
(202, 104), -- Tortilla lleva: Avena
(202, 106), -- Tortilla lleva: Aguacate
(203, 102), -- Bowl lleva: Arroz
(203, 103), -- Bowl lleva: Huevo
(203, 106); -- Bowl lleva: Aguacate

-- Comidas asignadas a los usuarios (Profile_Meal)
INSERT INTO public."Profile_Meal" ("Profile_user_id", "Meal_meal_id") VALUES
(1, 201), -- Carlos come Pollo con Arroz (Volumen)
(1, 203), -- Carlos también cena el Bowl de Arroz
(2, 202), -- Elena desayuna la Tortilla de Avena (Definición)
(3, 201); -- Sofía almuerza el Pollo con Arroz

COMMIT;
