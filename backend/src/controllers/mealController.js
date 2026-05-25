import { Profile } from '../models/index.js';

export const getRecommendedMeals = async (req, res) => {
  try {
    const { userId, objective } = req.query;
    const objetivo = objective || 'bajar';

    if (!userId) {
      return res.status(400).json({ error: "Falta el parámetro 'userId'." });
    }

    // 1. Obtener perfil biológico
    const perfil = await Profile.findOne({ where: { user_id: userId } });
    if (!perfil) {
      return res.status(404).json({ error: "Perfil no encontrado." });
    }

    const { age, gender, weight, height, activity_level } = perfil;
    const pesoInicial = parseFloat(weight);

    // 2. Cálculos metabólicos (Mifflin-St. Jeor)
    let TMB = (gender?.toLowerCase() === 'masculino') 
      ? (10 * pesoInicial) + (6.25 * parseFloat(height)) - (5 * parseInt(age)) + 5
      : (10 * pesoInicial) + (6.25 * parseFloat(height)) - (5 * parseInt(age)) - 161;

    const factores = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, intenso: 1.725 };
    const factorActividad = factores[activity_level?.toLowerCase()] || 1.2;
    const GETD = TMB * factorActividad;

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

      // Intenta encontrar una combinación aleatoria válida para este día
      for (let intento = 0; intento < 500; intento++) {
        const d = categorias[Math.floor(Math.random() * categorias.length)];
        const a = categorias[Math.floor(Math.random() * categorias.length)];
        const c = categorias[Math.floor(Math.random() * categorias.length)];

        totalCaloriasDia = d.kcal + a.kcal + c.kcal;
        balanceDiario = totalCaloriasDia - GETD;

        let esValido = false;
        if (objetivo === 'bajar') {
          if (totalCaloriasDia < GETD && totalCaloriasDia >= TMB) esValido = true;
        } else if (objetivo === 'subir') {
          if (totalCaloriasDia >= GETD * 1.10 && totalCaloriasDia <= GETD * 1.15) esValido = true;
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
      datos_usuario: { tmb: TMB.toFixed(0), getd: GETD.toFixed(0) },
      objetivo_usuario: objetivo,
      proyeccion_diaria: trayectoria100Dias
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};