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

    // 3. Motor de Simulación
    const categorias = [
      { tipo: 'bajo', kcal: 250 },
      { tipo: 'medio', kcal: 500 },
      { tipo: 'alto', kcal: 750 }
    ];

    const trayectoria100Dias = [];
    const KCAL_POR_KG = 7700;
    let pesoActualizado = pesoInicial;

    for (let dia = 1; dia <= 100; dia++) {
      let estructuraValida = null;
      let totalCaloriasDia = 0;
      let balanceDiario = 0;

      // Intentar encontrar combinación aleatoria válida
      for (let intento = 0; intento < 500; intento++) {
        const d = categorias[Math.floor(Math.random() * categorias.length)];
        const a = categorias[Math.floor(Math.random() * categorias.length)];
        const c = categorias[Math.floor(Math.random() * categorias.length)];

        totalCaloriasDia = d.kcal + a.kcal + c.kcal;
        balanceDiario = totalCaloriasDia - GETD;

        let esValido = false;
        if (objetivoChar === 'P') { // Perder
          if (totalCaloriasDia < GETD && totalCaloriasDia >= TMB) esValido = true;
        } else if (objetivoChar === 'G') { // Ganar
          if (totalCaloriasDia >= GETD * 1.10 && totalCaloriasDia <= GETD * 1.15) esValido = true;
        } else { // Mantener
          if (Math.abs(balanceDiario) <= 100) esValido = true;
        }

        if (esValido) {
          estructuraValida = {
            desayuno: { categoria: d.tipo, kcal: d.kcal },
            almuerzo: { categoria: a.tipo, kcal: a.kcal },
            cena: { categoria: c.tipo, kcal: c.kcal }
          };
          break;
        }
      }

      if (!estructuraValida) {
        return res.status(422).json({ error: `Imposible simular el día ${dia} con los rangos actuales.` });
      }

      pesoActualizado += (balanceDiario / KCAL_POR_KG);

      trayectoria100Dias.push({
        dia,
        calorias_consumidas: totalCaloriasDia,
        balance_energetico: Math.round(balanceDiario),
        peso_proyectado: parseFloat(pesoActualizado.toFixed(2)),
        recomendacion_menu: estructuraValida
      });
    }

    res.json({
      datos_biometricos: { tmb: TMB, getd: GETD, objetivo: objetivoChar },
      proyeccion_diaria: trayectoria100Dias
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};