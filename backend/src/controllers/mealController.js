import { Profile } from '../models/index.js';

export const getRecommendedMeals = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Falta el parámetro 'userId'." });
    }

    // 1. Obtener perfil biológico desde la BD
    const perfil = await Profile.findOne({ where: { user_id: userId } });
    if (!perfil) {
      return res.status(404).json({ error: "Perfil no encontrado." });
    }

    // 2. Extraer datos ya calculados y almacenados
    const TMB = parseFloat(perfil.basalMetabolicRate);
    const GETD = parseFloat(perfil.totalDailyEnergyExpenditure);
    const objetivoChar = perfil.objective; // 'P', 'G', o 'M'
    const pesoInicial = parseFloat(perfil.weight);

    // 3. Definir categorías
    const categorias = [
      { tipo: 'bajo', kcal: 250 },
      { tipo: 'medio', kcal: 500 },
      { tipo: 'alto', kcal: 750 }
    ];

    // 4. MONTE CARLO: Generar pool de combinaciones válidas (muestreo aleatorio)
    const poolCombinaciones = [];
    const TAMAÑO_POOL = 500; // Intentos aleatorios para llenar el pool

    for (let intento = 0; intento < TAMAÑO_POOL; intento++) {
      // Seleccionar categorías aleatoriamente
      const d = categorias[Math.floor(Math.random() * categorias.length)];
      const a = categorias[Math.floor(Math.random() * categorias.length)];
      const c = categorias[Math.floor(Math.random() * categorias.length)];

      const totalCaloriasDia = d.kcal + a.kcal + c.kcal;
      const balanceDiario = totalCaloriasDia - GETD;

      let esValido = false;

      if (objetivoChar === 'P') { // Perder
        if (totalCaloriasDia < GETD && totalCaloriasDia >= TMB) esValido = true;
      } else if (objetivoChar === 'G') { // Ganar
        if (totalCaloriasDia >= GETD * 1.10 && totalCaloriasDia <= GETD * 1.15) esValido = true;
      } else if (objetivoChar === 'M') { // Mantener
        if (Math.abs(balanceDiario) <= 100) esValido = true;
      }

      if (esValido) {
        poolCombinaciones.push({
          estructura: {
            desayuno: { categoria: d.tipo, kcal: d.kcal },
            almuerzo: { categoria: a.tipo, kcal: a.kcal },
            cena: { categoria: c.tipo, kcal: c.kcal }
          },
          totalCaloriasDia,
          balanceDiario
        });
      }
    }

    // 5. Validar que exista al menos una opción válida
    if (poolCombinaciones.length === 0) {
      return res.status(422).json({ 
        error: `No hay combinaciones válidas para el objetivo '${objetivoChar}' con los parámetros actuales.`,
        diagnostico: {
          tmb: TMB,
          getd: GETD,
          objetivo: objetivoChar,
          rango_buscado: objetivoChar === 'P' 
            ? `${TMB} - ${GETD} kcal`
            : objetivoChar === 'G'
            ? `${(GETD * 1.10).toFixed(0)} - ${(GETD * 1.15).toFixed(0)} kcal`
            : `${GETD - 100} - ${GETD + 100} kcal`
        }
      });
    }

    // 6. MONTE CARLO: Simular 100 días muestreando SIN REEMPLAZO del pool
    const trayectoria100Dias = [];
    const KCAL_POR_KG = 7700;
    let pesoActualizado = pesoInicial;
    let poolActual = [...poolCombinaciones]; // Copia del pool para muestreo sin reemplazo

    for (let dia = 1; dia <= 100; dia++) {
      // Si se agota el pool, regenerar (hacer más muestreos aleatorios)
      if (poolActual.length === 0) {
        for (let intento = 0; intento < TAMAÑO_POOL; intento++) {
          const d = categorias[Math.floor(Math.random() * categorias.length)];
          const a = categorias[Math.floor(Math.random() * categorias.length)];
          const c = categorias[Math.floor(Math.random() * categorias.length)];

          const totalCaloriasDia = d.kcal + a.kcal + c.kcal;
          const balanceDiario = totalCaloriasDia - GETD;

          let esValido = false;

          if (objetivoChar === 'P') {
            if (totalCaloriasDia < GETD && totalCaloriasDia >= TMB) esValido = true;
          } else if (objetivoChar === 'G') {
            if (totalCaloriasDia >= GETD * 1.10 && totalCaloriasDia <= GETD * 1.15) esValido = true;
          } else if (objetivoChar === 'M') {
            if (Math.abs(balanceDiario) <= 100) esValido = true;
          }

          if (esValido) {
            poolActual.push({
              estructura: {
                desayuno: { categoria: d.tipo, kcal: d.kcal },
                almuerzo: { categoria: a.tipo, kcal: a.kcal },
                cena: { categoria: c.tipo, kcal: c.kcal }
              },
              totalCaloriasDia,
              balanceDiario
            });
          }
        }
      }

      // Seleccionar una combinación aleatoria del pool (sin reemplazo)
      const indiceAleatorio = Math.floor(Math.random() * poolActual.length);
      const combinacionElegida = poolActual[indiceAleatorio];
      poolActual.splice(indiceAleatorio, 1); // Remover del pool

      // Agregar variación aleatoria ±50 kcal
      const variacion = (Math.random() - 0.5) * 100; // ±50 kcal
      const totalCaloriasConVariacion = combinacionElegida.totalCaloriasDia + variacion;
      const balanceDiarioConVariacion = totalCaloriasConVariacion - GETD;

      pesoActualizado += (balanceDiarioConVariacion / KCAL_POR_KG);

      trayectoria100Dias.push({
        dia,
        calorias_consumidas: Math.round(totalCaloriasConVariacion),
        balance_energetico: Math.round(balanceDiarioConVariacion),
        peso_proyectado: parseFloat(pesoActualizado.toFixed(2)),
        recomendacion_menu: combinacionElegida.estructura
      });
    }

    res.json({
      datos_biometricos: { tmb: TMB, getd: GETD, objetivo: objetivoChar },
      pool_size: poolCombinaciones.length,
      metodo: 'Monte Carlo - Muestreo sin reemplazo',
      proyeccion_diaria: trayectoria100Dias
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};