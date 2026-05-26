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

    // ========================================================
    // Función auxiliar para generar un pool de combinaciones válidas
    // ========================================================
    function generarPoolValido(tmb, getd, objetivo, tamaño = 500) {
      const pool = [];
      for (let intento = 0; intento < tamaño; intento++) {
        const d = categorias[Math.floor(Math.random() * categorias.length)];
        const a = categorias[Math.floor(Math.random() * categorias.length)];
        const c = categorias[Math.floor(Math.random() * categorias.length)];
        const totalCaloriasDia = d.kcal + a.kcal + c.kcal;
        const balanceDiario = totalCaloriasDia - getd;
        let esValido = false;

        if (objetivo === 'P') { // Perder
          if (totalCaloriasDia < getd && totalCaloriasDia >= tmb) esValido = true;
        } else if (objetivo === 'G') { // Ganar
          const minSuperavit = getd * 1.10;
          const maxSuperavit = getd * 1.15;
          if (totalCaloriasDia >= minSuperavit && totalCaloriasDia <= maxSuperavit) esValido = true;
        } else if (objetivo === 'M') { // Mantener
          if (Math.abs(balanceDiario) <= 100) esValido = true;
        }

        if (esValido) {
          pool.push({
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
      return pool;
    }

    // 4. Generar pool inicial de combinaciones válidas
    let poolCombinaciones = generarPoolValido(TMB, GETD, objetivoChar, 500);
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

    // 5. Simular 100 días muestreando sin reemplazo
    const KCAL_POR_KG = 7700;
    let pesoActualizado = pesoInicial;
    let poolActual = [...poolCombinaciones];
    const trayectoria100Dias = [];

    for (let dia = 1; dia <= 100; dia++) {
      // Regenerar pool si se agota
      if (poolActual.length === 0) {
        poolActual = generarPoolValido(TMB, GETD, objetivoChar, 500);
        if (poolActual.length === 0) {
          // Si sigue sin haber combinaciones, devolvemos error (no debería ocurrir)
          return res.status(422).json({
            error: 'No se pudo generar ningún combo válido para continuar la simulación.'
          });
        }
      }

      // Seleccionar una combinación aleatoria y eliminarla del pool
      const indice = Math.floor(Math.random() * poolActual.length);
      const combinacionElegida = poolActual[indice];
      poolActual.splice(indice, 1);

      // Aplicar variación aleatoria de ±50 kcal, limitada al rango seguro según objetivo
      let variacion = (Math.random() - 0.5) * 100;
      let totalCaloriasConVariacion = combinacionElegida.totalCaloriasDia + variacion;

      if (objetivoChar === 'P') {
        totalCaloriasConVariacion = Math.min(Math.max(totalCaloriasConVariacion, TMB), GETD);
      } else if (objetivoChar === 'G') {
        const minSuperavit = GETD * 1.10;
        const maxSuperavit = GETD * 1.15;
        totalCaloriasConVariacion = Math.min(Math.max(totalCaloriasConVariacion, minSuperavit), maxSuperavit);
      } else if (objetivoChar === 'M') {
        totalCaloriasConVariacion = Math.min(Math.max(totalCaloriasConVariacion, GETD - 100), GETD + 100);
      }

      const balanceDiarioConVariacion = totalCaloriasConVariacion - GETD;
      pesoActualizado += (balanceDiarioConVariacion / KCAL_POR_KG);

      trayectoria100Dias.push({
        dia,
        calorias_consumidas: Math.round(totalCaloriasConVariacion),
        balance_energetico: Math.round(balanceDiarioConVariacion),
        peso_proyectado: parseFloat(pesoActualizado.toFixed(2)),
        recomendacion_menu: combinacionElegida.estructura   // menú base (sin variación)
      });
    }

    res.json({
      datos_biometricos: { tmb: TMB, getd: GETD, objetivo: objetivoChar },
      pool_size: poolCombinaciones.length,
      metodo: 'Monte Carlo - Muestreo sin reemplazo con variación ±50 kcal acotada',
      proyeccion_diaria: trayectoria100Dias
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
