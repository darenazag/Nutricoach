1. Los límites Biológicos (Entrada de Datos)

La base del sistema es la personalización. En lugar de configuraciones genéricas, el algoritmo extrae la información directamente de la Base de Datos (Tabla Profile) con lo que se calcula las siguientes métricas.

    TMB (Tasa Metabólica Basal): Calculamos la energía mínima que el cuerpo necesita para sobrevivir usando la fórmula de Mifflin-St. Jeor, basada en la edad, género, peso y altura del usuario.

    GETD (Gasto Energético Total Diario): Ajustamos la TMB según el Nivel de Actividad Física del usuario, determinando cuánto consume realmente en su día a día.

2. Seguridad (La Lógica del GAP)

Para que el plan sea seguro, definimos un "Gap Metabólico" que el algoritmo debe respetar estrictamente antes de proponer cualquier menú:

    Para bajar de peso: El consumo total diario debe ser menor que el GETD, para crear déficit, pero mayor o igual a la TMB, para asegurar que el cuerpo no entre en modo de inanición y proteja el metabolismo.

    Para subir de peso: Se busca un superávit controlado, situando el consumo diario entre el 10% y el 15% por encima del GETD.

3. Simulación de Montecarlo 

Hemos implementado un modelo de Montecarlo, muestreo aleatorio, que en lugar de predecir una línea recta, simula la realidad diaria durante 100 días.

    Estructura del Menú: El sistema divide el día en tres bloques: desayuno, almuerzo y cena. Asigna a cada uno una categoría calórica (Bajo: 250 kcal, Medio: 500 kcal, Alto: 750 kcal).

    Muestreo Día a Día: Para cada uno de los 100 días, combina estas categorías de forma aleatoria. Si la combinación resultante cumple con el GAP biológico del usuario, se valida; si no, el algoritmo descarta la combinación y vuelve a intentar hasta encontrar una opción válida.

4. El Producto Final: La Trayectoria de 100 Días

El resultado de este proceso no es un menú estático, sino un Array de Proyección.

    Efecto Acumulativo: El sistema calcula la variación de peso diaria basada en el balance calórico, dividiendo el exceso o déficit entre 7,700 kcal, que es la constante biológica de 1 kg de grasa.

    Utilidad para el Frontend: Este array contiene la "foto" de cada día (calorías consumidas, balance energético, peso proyectado y las categorías de comida asignadas).

    Conexión con el Siguiente Módulo: La categoría asignada a cada comida en el array (ej. "Desayuno: Alto") es el insumo que el siguiente microservicio de tu backend utilizará para buscar recetas reales que encajen exactamente en ese requerimiento calórico.

En esencia, hemos transformado datos biológicos crudos en un plan de acción dinámico y predictivo, donde el usuario no solo ve lo que debe comer, sino cómo su cuerpo evolucionará hacia su objetivo en un horizonte de 100 días.
