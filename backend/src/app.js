import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';

// Importar los enrutadores
import authRouter from './routers/authRouter.js';
import profileRouter from './routers/profileRouter.js';
import mealRouter from './routers/mealRouter.js';

// Importar relaciones para asegurar que Sequelize inicialice bien los JOINs
import './models/index.js'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(cors());
app.use(express.json());

// Montaje de Rutas Modulares
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/meals', mealRouter);

// Endpoint de prueba de salud de la API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend de MC Diet Planner corriendo perfectamente.' });
});

// Función para conectar a la base de datos con reintentos automáticos
async function iniciarServidor() {
  const MAX_REINTENTOS = 5;
  let intento = 1;

  while (intento <= MAX_REINTENTOS) {
    try {
      // Intenta establecer la conexión
      await sequelize.authenticate();
      
      console.log('\n======================================================');
      console.log('Conexión con PostgreSQL (Docker) verificada exitosamente.');
      console.log('======================================================\n');
      
      // Si la conexión es exitosa, se levanta el puerto de Express
      app.listen(PORT, () => {
        console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
      });
      return;

    } catch (error) {
      console.log(`\n[Intento ${intento}/${MAX_REINTENTOS}] La base de datos aún se está inicializando...`);
      console.log(`Razón: ${error.message}`);
      console.log('Reintentando la conexión en 3 segundos...\n');
      
      intento++;
      // Detiene la ejecución del código durante 3 segundos antes de volver a empezar el bucle
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Si agota los 5 intentos sin éxito, detiene el contenedor para que veas el fallo real
  console.error('\nError crítico: No se pudo conectar a la base de datos tras varios intentos.');
  process.exit(1);
}

// Arrancar el proceso de conexión
iniciarServidor();