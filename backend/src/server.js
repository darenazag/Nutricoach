import app from './app.js'
import sequelize from './database/config.js'
import './models/index.js'

const PORT = process.env.PORT || 3001

async function start() {
  try {
    await sequelize.authenticate()
    console.log('Conectado a PostgreSQL')

    await sequelize.sync()
    console.log('Modelos sincronizados')

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`)
    })
  } catch (error) {
    console.error('Error al iniciar:', error)
  }
}

start()
