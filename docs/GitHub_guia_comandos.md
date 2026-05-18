# Guia rapida de Git y GitHub para Nutricoach

Esta guía define el flujo de trabajo recomendado para NutriCoach AI, una app fullstack de hábitos saludables desarrollada con React + TypeScript + Vite en el frontend, Node.js + Express en el backend y PostgreSQL + Sequelize como base de datos.
Repositorio del proyecto:

```bash
git@github.com:darenazag/Nutricoach.git
```

---

## 1. Ramas del proyecto

- `main` -> version estable del proyecto. Debe contener entregas revisadas.
- `dev` -> rama de integracion del equipo. Aqui se juntan las tareas antes de pasar a `main`.
- `feat/...` -> ramas para nuevas funcionalidades.
- `fix/...` -> ramas para corregir errores.
- `docs/...` -> ramas para documentacion.
- `chore/...` -> ramas para mantenimiento, configuracion o tareas internas.

Regla principal:

**No trabajar directamente en `main` ni en `dev`.**

Cada persona debe crear una rama desde `dev`, trabajar ahi y abrir un Pull Request hacia `dev`.

---

## 2. Configuracion inicial

### Comprobar que el remoto usa SSH

```bash
git remote -v
```

Debe aparecer:

```bash
origin  git@github.com:darenazag/Nutricoach.git (fetch)
origin  git@github.com:darenazag/Nutricoach.git (push)
```

Si aparece `https://github.com/darenazag/Nutricoach.git`, cambialo asi:

```bash
git remote set-url origin git@github.com:darenazag/Nutricoach.git
```

### Probar la conexion SSH con GitHub

```bash
ssh -T git@github.com
```

### Descargar informacion de ramas remotas

```bash
git fetch origin
```

### Crear la rama `dev` local si todavia no existe

El repositorio ya tiene `origin/dev`. Si en tu maquina no tienes una rama local `dev`, creala siguiendo la remota:

```bash
git switch --track origin/dev
```

Si ya existe localmente:

```bash
git switch dev
git pull --ff-only origin dev
```

---

## 3. Flujo para empezar una tarea

### Paso 1: ir a `dev`

```bash
git switch dev
```

### Paso 2: traer la ultima version de `dev`

```bash
git pull --ff-only origin dev
```

### Paso 3: crear una rama para tu tarea

```bash
git switch -c feat/nombre-de-tu-tarea
```

Ejemplos para Nutricoach:

```bash
git switch -c feat/meal-log
git switch -c feat/calorie-summary
git switch -c feat/nutrition-goals
git switch -c feat/profile-screen
git switch -c fix/login-validation
git switch -c docs/github-workflow
```

---

## 4. Guardar cambios con commits

### Ver que archivos has cambiado

```bash
git status
```

### Ver diferencias antes de confirmar

```bash
git diff
```

### Anadir archivos al commit

Anadir todo:

```bash
git add .
```

Anadir un archivo concreto:

```bash
git add README.md
```

### Crear el commit

```bash
git commit -m "feat: add meal log screen"
```

Ejemplos:

```bash
git commit -m "feat: add calorie summary"
git commit -m "fix: correct nutrition goal validation"
git commit -m "docs: update GitHub workflow guide"
git commit -m "chore: add project setup files"
```

Recomendacion:

Haz commits pequenos y claros. Evita mezclar cambios de pantalla, logica, estilos y documentacion en el mismo commit si no forman parte de la misma tarea.

---

## 5. Subir tu rama a GitHub

La primera vez que subes una rama:

```bash
git push -u origin feat/nombre-de-tu-tarea
```

Ejemplo:

```bash
git push -u origin feat/meal-log
```

Las siguientes veces:

```bash
git push
```

---

## 6. Mantener tu rama actualizada con `dev`

Hazlo antes de empezar a trabajar, antes de subir cambios importantes y antes de abrir un Pull Request.

Desde tu rama de trabajo:

```bash
git fetch origin
git rebase origin/dev
```

Si hay conflictos durante el rebase, resuelvelos archivo por archivo, despues:

```bash
git add .
git rebase --continue
```

Si el rebase se complica y necesitas volver al estado anterior:

```bash
git rebase --abort
```

Alternativa mas simple si el equipo prefiere evitar rebase:

```bash
git merge origin/dev
```

Elegid una estrategia como equipo y usad siempre la misma.

---

## 7. Flujo completo recomendado

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feat/nueva-tarea

# trabajar en archivos...

git status
git add .
git commit -m "feat: describe el cambio"
git fetch origin
git rebase origin/dev
git push -u origin feat/nueva-tarea
```

---

## 8. Pull Requests

Un Pull Request es la forma correcta de proponer que una rama se integre en otra.

En Nutricoach, lo normal es:

- desde `feat/...`, `fix/...`, `docs/...` o `chore/...`
- hacia `dev`

Solo se deberia hacer PR hacia `main` cuando `dev` ya este revisada y lista para una entrega estable.

### Crear un PR

1. Sube tu rama con `git push`.
2. Entra en GitHub.
3. Pulsa **Compare & pull request**.
4. Comprueba:
   - base branch = `dev`
   - compare branch = tu rama
5. Escribe un titulo claro.
6. Explica que has cambiado y como probarlo.
7. Pide revision a otra persona del equipo.

### Plantilla simple para el PR

```md
## Que he hecho
- He anadido ...
- He corregido ...

## Como probarlo
- Ejecutar ...
- Ir a ...
- Comprobar que ...

## Notas
- Falta revisar ...
- Puede afectar a ...
```

### Antes de crear el PR

- La rama sale de `dev`.
- El PR apunta a `dev`.
- El cambio hace una sola cosa clara.
- No hay archivos basura, temporales ni secretos.
- Has probado lo que cambiaste.
- Has actualizado tu rama con `origin/dev`.

---

## 9. Revisar un Pull Request

Antes de hacer merge, revisad:

- Que archivos cambia.
- Si el cambio corresponde con la descripcion.
- Si rompe algo existente.
- Si el codigo se entiende.
- Si faltan pruebas o pasos de verificacion.
- Si hay conflictos con `dev`.
- Si se han subido datos sensibles por error.

Si esta correcto, se puede hacer merge hacia `dev`.

Despues del merge, la persona que hizo la rama puede borrarla en GitHub o en local.

---

## 10. Preparar una entrega estable

Cuando `dev` este probada y validada:

1. Abrir un PR desde `dev` hacia `main`.
2. Revisar los cambios.
3. Confirmar que la app funciona.
4. Hacer merge en `main`.

Despues, todos deben actualizar sus ramas:

```bash
git switch dev
git pull --ff-only origin dev
git switch main
git pull --ff-only origin main
```

---

## 11. Resolver conflictos

Un conflicto ocurre cuando dos personas han cambiado la misma parte de un archivo.

Pasos basicos:

1. Lee que archivo tiene conflicto.
2. Abre el archivo en VS Code.
3. Busca marcas como estas:

```txt
<<<<<<< HEAD
Tu cambio
=======
Cambio que viene de otra rama
>>>>>>> rama-remota
```

4. Decide que version dejar o combina ambas.
5. Borra las marcas del conflicto.
6. Guarda el archivo.
7. Ejecuta:

```bash
git add .
```

Si estabas en rebase:

```bash
git rebase --continue
```

Si estabas en merge:

```bash
git commit -m "fix: resolve merge conflict"
```

Si no lo teneis claro, parad y resolved el conflicto juntos. Es mejor invertir 10 minutos que romper la rama de integracion.

---

## 12. Borrar ramas

### Borrar una rama local

```bash
git branch -d feat/nombre-de-tu-tarea
```

### Borrar una rama remota

```bash
git push origin --delete feat/nombre-de-tu-tarea
```

---

## 13. Comandos utiles de consulta

### Ver rama actual

```bash
git branch --show-current
```

### Ver ramas locales y remotas

```bash
git branch -a
```

### Ver estado del repo

```bash
git status
```

### Ver historial resumido

```bash
git log --oneline --graph --all
```

### Ver diferencias preparadas para commit

```bash
git diff --staged
```

---

## 14. Seguridad del proyecto

Nutricoach puede acabar manejando datos personales o nutricionales. No subais al repositorio:

- Tokens de APIs.
- Passwords.
- Archivos `.env` con credenciales.
- Datos reales de usuarios.
- Capturas con informacion personal.
- Archivos generados pesados si no son necesarios.

Usad `.env.example` para documentar variables de entorno sin valores reales.

---

## 15. Errores tipicos y como evitarlos

### Trabajar en `main`

Solucion:

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feat/nombre-tarea
```

### Abrir un PR hacia `main` por error

Solucion:

Revisa siempre que el PR normal del dia a dia tenga:

- base = `dev`
- compare = tu rama

### Subir cambios sin probar

Solucion:

Antes del commit o del PR, ejecuta las pruebas disponibles del proyecto. Cuando exista `package.json`, revisa los scripts definidos:

```bash
npm run lint
npm test
```

Cuando existan los scripts definitivos del frontend y backend, seguid los comandos documentados en el README.md.

### Mezclar muchas tareas en una rama

Solucion:

Una rama debe representar una tarea concreta. Si aparece otra tarea distinta, cread otra rama.

---

## 16. Checklist antes de hacer push

- [ ] Estoy en mi rama de trabajo, no en `main` ni en `dev`.
- [ ] He hecho `git status`.
- [ ] He revisado el diff.
- [ ] He probado mis cambios.
- [ ] He hecho commits pequenos y claros.
- [ ] He actualizado mi rama con `origin/dev`.
- [ ] No hay conflictos pendientes.
- [ ] No he subido secretos ni datos personales.

---

## 17. Checklist antes de crear un Pull Request

- [ ] Mi rama esta subida a GitHub.
- [ ] El PR apunta a `dev`.
- [ ] El titulo explica el cambio.
- [ ] La descripcion incluye que se ha hecho y como probarlo.
- [ ] El cambio hace una sola cosa clara.
- [ ] He revisado los archivos modificados.
- [ ] La app sigue funcionando o he indicado que no se ha podido probar.

---

## 18. Resumen ultra corto

Crear rama nueva desde `dev`:

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feat/nueva-rama
```

Guardar cambios:

```bash
git add .
git commit -m "feat: mi cambio"
```

Actualizar con `dev`:

```bash
git fetch origin
git rebase origin/dev
```

Subir rama:

```bash
git push -u origin feat/nueva-rama
```

Hacer PR:

- desde tu rama
- hacia `dev`

---

## 19. Recomendacion final para Nutricoach

Para el equipo:

- `main` es la entrega estable.
- `dev` es la integracion diaria.
- Cada persona trabaja en su propia rama.
- Todo cambio entra por Pull Request.
- Los PR normales van hacia `dev`.
- `main` solo recibe cambios cuando `dev` ya esta revisada.
- No mezcleis varias tareas en la misma rama.
- Proteged credenciales y datos personales desde el principio.
