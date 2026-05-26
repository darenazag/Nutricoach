// ============================================================================
// MONTE CARLO – Proyección de 100 días con variedad de menús
// ============================================================================

/** Kcal por categoría de comida. */
const KCAL: Record<string, number> = { bajo: 250, medio: 500, alto: 750 };
type Categoria = 'bajo' | 'medio' | 'alto';

interface Combo {
  desayuno: Categoria;
  almuerzo: Categoria;
  cena: Categoria;
}

/**
 * Genera un pool de combinaciones válidas para el objetivo del usuario.
 * @param tmb Tasa metabólica basal (kcal)
 * @param getd Gasto energético total diario (kcal)
 * @param objective Objetivo del perfil ('P' | 'M' | 'G')
 * @param poolSize Número máximo de combinaciones a generar (por defecto 500)
 * @returns Array de combos válidos, cada uno con su estructura y total calórico
 */
function generarPoolValido(
  tmb: number,
  getd: number,
  objective: 'P' | 'M' | 'G',
  poolSize: number = 500
): { combo: Combo; totalCalorias: number; balance: number }[] {
  const pool: { combo: Combo; totalCalorias: number; balance: number }[] = [];
  const categorias: Categoria[] = ['bajo', 'medio', 'alto'];

  for (let intento = 0; intento < poolSize; intento++) {
    const desayuno = categorias[Math.floor(Math.random() * categorias.length)];
    const almuerzo = categorias[Math.floor(Math.random() * categorias.length)];
    const cena = categorias[Math.floor(Math.random() * categorias.length)];
    const totalCalorias = KCAL[desayuno] + KCAL[almuerzo] + KCAL[cena];
    const balance = totalCalorias - getd;
    let valido = false;

    if (objective === 'P') {
      // Perder peso: déficit controlado, no por debajo de TMB
      valido = totalCalorias < getd && totalCalorias >= tmb;
    } else if (objective === 'G') {
      // Ganar masa: superávit del 10% al 15% sobre GETD
      const minSuperavit = getd * 1.10;
      const maxSuperavit = getd * 1.15;
      valido = totalCalorias >= minSuperavit && totalCalorias <= maxSuperavit;
    } else if (objective === 'M') {
      // Mantener: balance cercano a 0 (±100 kcal)
      valido = Math.abs(balance) <= 100;
    }

    if (valido) {
      pool.push({
        combo: { desayuno, almuerzo, cena },
        totalCalorias,
        balance,
      });
    }
  }
  return pool;
}

/**
 * GET /api/meals/recommend - Proyección de 100 días con simulación Monte Carlo.
 * Requiere autenticación.
 */
export async function recommend(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.sub;

  const profile = await profileModel.findById(userId);
  if (!profile) {
    throw HttpError.notFound('El usuario no tiene perfil registrado');
  }

  const tmb = toFiniteProfileNumber(profile.basalMetabolicRate, 'basalMetabolicRate');
  const getd = toFiniteProfileNumber(profile.totalDailyEnergyExpenditure, 'totalDailyEnergyExpenditure');
  const weightStart = toFiniteProfileNumber(profile.weight, 'weight');
  const objective = profile.objective;

  // 1. Generar el pool de combinaciones válidas
  let pool = generarPoolValido(tmb, getd, objective, 500);
  if (pool.length === 0) {
    // Si no hay ninguna combinación válida, devolver error detallado
    throw new HttpError(
      422,
      `No hay combinaciones válidas para el objetivo '${objective}' con TMB=${tmb}, GETD=${getd}.`
    );
  }

  // 2. Simular 100 días muestreando sin reemplazo (con regeneración del pool si se agota)
  const KCAL_POR_KG = 7700;
  let pesoActual = weightStart;
  let poolActual = [...pool]; // copia para muestreo sin reemplazo
  const proyeccion_diaria: DiaProyeccion[] = [];

  for (let dia = 1; dia <= 100; dia++) {
    // Si el pool actual se queda vacío, lo regeneramos
    if (poolActual.length === 0) {
      poolActual = generarPoolValido(tmb, getd, objective, 500);
      if (poolActual.length === 0) {
        // Si sigue sin haber combinaciones, salimos con error (no debería pasar)
        throw new HttpError(422, 'No se pudo generar ninguna combinación válida para continuar la simulación.');
      }
    }

    // Seleccionar una combinación aleatoria y eliminarla del pool
    const indice = Math.floor(Math.random() * poolActual.length);
    const { combo, totalCalorias, balance } = poolActual[indice];
    poolActual.splice(indice, 1);

    // Añadir variación aleatoria de ±50 kcal para simular imprecisiones diarias
    const variacion = (Math.random() - 0.5) * 100;
    const caloriasConVariacion = totalCalorias + variacion;
    const balanceConVariacion = caloriasConVariacion - getd;

    // Actualizar peso según el balance energético (1 kg de grasa ≈ 7700 kcal)
    pesoActual += balanceConVariacion / KCAL_POR_KG;

    proyeccion_diaria.push({
      dia,
      calorias_consumidas: Math.round(caloriasConVariacion),
      balance_energetico: Math.round(balanceConVariacion),
      peso_proyectado: Math.round(pesoActual * 100) / 100,
      recomendacion_menu: {
        desayuno: { categoria: combo.desayuno, kcal: KCAL[combo.desayuno] },
        almuerzo: { categoria: combo.almuerzo, kcal: KCAL[combo.almuerzo] },
        cena:     { categoria: combo.cena,     kcal: KCAL[combo.cena] },
      },
    });
  }

  res.json({
    datos_usuario: {
      tmb: `${tmb} kcal`,
      getd: `${getd} kcal`,
    },
    objetivo_usuario: OBJECTIVE_LABEL[objective],
    metodo: 'Monte Carlo - Muestreo sin reemplazo con variación ±50 kcal',
    proyeccion_diaria,
  });
}
