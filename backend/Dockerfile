FROM node:18-alpine

# Crear el directorio de la aplicación dentro del contenedor
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código del backend
COPY . .

# Exponer el puerto del servidor Express
EXPOSE 3000

# Comando para ejecutar en modo desarrollo (usando el script 'dev' con nodemon que definimos)
CMD ["npm", "run", "dev"]