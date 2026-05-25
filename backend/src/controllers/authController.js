import { User, Profile, sequelize } from '../models/index.js';

// Función auxiliar para calcular TMB (Mifflin-St Jeor) y GETD en el servidor
const calculateMetabolism = (weight, height, age, gender, activityFactor) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age);

  // 1. Tasa Metabólica Basal (TMB)
  let bmr = (10 * w) + (6.25 * h) - (5 * a);
  if (gender === 'M') bmr += 5;       // Masculino
  if (gender === 'F') bmr -= 161;     // Femenino

  // 2. Gasto Energético Total Diario (GETD) basado en el activityFactor del SQL
  let factorMultiplier = 1.2; // 'S' - Sedentario por defecto
  if (activityFactor === 'L') factorMultiplier = 1.375; // Ligero
  if (activityFactor === 'A') factorMultiplier = 1.55;  // Activo (Moderado)
  if (activityFactor === 'V') factorMultiplier = 1.725; // Muy Activo

  const tdee = bmr * factorMultiplier;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
};

export const register = async (req, res) => {
  // Iniciamos una transacción de Sequelize para asegurar que si falla el usuario, 
  // tampoco se cree el perfil (consistencia de datos)
  const transaction = await sequelize.transaction();
  
  try {
    const { name, email, password, weight, age, height, gender, activityFactor, objective } = req.body;

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Generar un ID numérico único (simulando secuencia para el campo NUMERIC del SQL)
    const userId = Math.floor(100000 + Math.random() * 900000);

    // Calcular las métricas metabólicas científicas automáticamente
    const { bmr, tdee } = calculateMetabolism(weight, height, age, gender, activityFactor);

    // 1. Crear el Perfil (Obligatorio primero por restricción de FK del init.sql)
    const profile = await Profile.create({
      user_id: userId,
      weight,
      age,
      height,
      gender,
      activityFactor,
      objective,
      basalMetabolicRate: bmr,
      totalDailyEnergyExpenditure: tdee
    }, { transaction });

    // 2. Crear el Usuario vinculado
    const user = await User.create({
      user_id: userId,
      name,
      email,
      password, 
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: { id: user.user_id, name: user.name, email: user.email },
      profile
    });

  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario incluyendo su perfil metabólico asignado
    const user = await User.findOne({
      where: { email },
      include: [{ model: Profile }]
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        profile: user.Profile 
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};