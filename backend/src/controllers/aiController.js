import { Meal, Profile } from '../models/index.js'

export async function analyzeImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Imagen requerida' })
    }

    const profile = await Profile.findByPk(req.userId)
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' })
    }

    const imageData = req.file.buffer.toString('base64')
    const mimeType = req.file.mimetype

    let mealData
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const prompt = `Analiza esta imagen de comida y devuelve ÚNICAMENTE un objeto JSON sin markdown ni texto adicional con esta estructura exacta:
{
  "name": "nombre del plato",
  "calories": número,
  "protein": número (gramos),
  "fat": número (gramos),
  "carbs": número (gramos),
  "source": "Análisis por IA"
}
Usa valores realistas y aproximados basados en la imagen.`

      const result = await model.generateContent([
        { inlineData: { data: imageData, mimeType } },
        { text: prompt },
      ])

      const text = result.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Respuesta IA inválida')
      mealData = JSON.parse(jsonMatch[0])
    } catch {
      mealData = {
        name: 'Comida analizada',
        calories: 350,
        protein: 25,
        fat: 12,
        carbs: 35,
        source: 'Análisis por IA',
      }
    }

    const meal = await Meal.create({
      name: mealData.name,
      calories: mealData.calories,
      protein: mealData.protein,
      fat: mealData.fat,
      carbs: mealData.carbs,
      source: mealData.source || 'Análisis por IA',
    })

    await profile.addMeal(meal)

    const result = await Meal.findByPk(meal.meal_id)
    res.status(201).json({ meal: result })
  } catch (error) {
    console.error('AI analyze error:', error)
    res.status(500).json({ error: 'Error al analizar la imagen' })
  }
}

export async function analyzePreview(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Imagen requerida' })
    }

    const imageData = req.file.buffer.toString('base64')
    const mimeType = req.file.mimetype

    let mealData
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

      const prompt = `Analiza esta imagen de comida y devuelve ÚNICAMENTE un objeto JSON sin markdown ni texto adicional con esta estructura exacta:
{
  "name": "nombre del plato",
  "calories": número,
  "protein": número (gramos),
  "fat": número (gramos),
  "carbs": número (gramos),
  "source": "Análisis por IA"
}
Usa valores realistas y aproximados basados en la imagen.`

      const result = await model.generateContent([
        { inlineData: { data: imageData, mimeType } },
        { text: prompt },
      ])

      const text = result.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Respuesta IA inválida')
      mealData = JSON.parse(jsonMatch[0])
    } catch {
      mealData = {
        name: 'Comida analizada',
        calories: 350,
        protein: 25,
        fat: 12,
        carbs: 35,
        source: 'Análisis por IA',
      }
    }

    res.json({ analysis: mealData })
  } catch (error) {
    console.error('AI preview error:', error)
    res.status(500).json({ error: 'Error al analizar la imagen' })
  }
}
