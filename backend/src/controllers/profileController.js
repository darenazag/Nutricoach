import { Profile } from '../models/index.js';

export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await Profile.findByPk(userId);
    
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado.' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { weight, age, height, activityFactor, objective } = req.body;

    const profile = await Profile.findByPk(userId);
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado.' });

    // Tomar los valores nuevos o mantener los actuales
    const updatedWeight = weight || profile.weight;
    const updatedHeight = height || profile.height;
    const updatedAge = age || profile.age;
    const updatedGender = profile.gender;
    const updatedActivity = activityFactor || profile.activityFactor;

    // Recalcular TMB y GETD con los datos actualizados
    let bmr = (10 * parseFloat(updatedWeight)) + (6.25 * parseFloat(updatedHeight)) - (5 * parseInt(updatedAge));
    bmr += (updatedGender === 'M') ? 5 : -161;

    let factor = 1.2;
    if (updatedActivity === 'L') factor = 1.375;
    if (updatedActivity === 'A') factor = 1.55;
    if (updatedActivity === 'V') factor = 1.725;

    // Guardar cambios en PostgreSQL
    await profile.update({
      weight: updatedWeight,
      age: updatedAge,
      height: updatedHeight,
      activityFactor: updatedActivity,
      objective: objective || profile.objective,
      basalMetabolicRate: Math.round(bmr),
      totalDailyEnergyExpenditure: Math.round(bmr * factor)
    });

    res.json({ success: true, message: 'Perfil e indicadores metabólicos actualizados.', profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};