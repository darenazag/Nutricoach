# Diagramas tecnicos — NutriCoach

Estos diagramas documentan el estado auditado del proyecto en la rama `integration/full-integration-sanitized`.
Estan escritos en Mermaid para que GitHub los renderice directamente y puedan mantenerse junto al codigo.

## 1. Diagrama ER

El diagrama ER combina la base funcional PostgreSQL y las colecciones principales de MongoDB usadas por el modulo IA.
Las relaciones entre PostgreSQL y MongoDB son logicas por `userId`; no son claves foraneas fisicas entre motores.

```mermaid
erDiagram
    USER_ACCOUNT {
        numeric user_id PK
        varchar name
        varchar email
        varchar password
        enum role
    }

    PROFILE {
        numeric user_id PK,FK
        numeric weight
        numeric age
        numeric height
        char gender
        char activityFactor
        char objective
        numeric basalMetabolicRate
        numeric totalDailyEnergyExpenditure
    }

    MEAL {
        numeric meal_id PK
        varchar name
        numeric calories
        numeric protein
        numeric fat
        numeric carbs
        varchar img
        varchar source
    }

    FOOD_ITEM {
        numeric food_id PK
        numeric protein
        numeric calories
        numeric carbs
        numeric fat
        varchar source
    }

    PROFILE_MEAL {
        numeric Profile_user_id FK
        numeric Meal_meal_id FK
    }

    MEAL_FOOD_ITEM {
        numeric Meal_meal_id FK
        numeric Food_item_food_id FK
    }

    AI_CONVERSATION {
        string conversationId PK
        string userId
        string type
        string status
        date createdAt
        date updatedAt
    }

    AI_MESSAGE {
        string messageId PK
        string conversationId FK
        string role
        string content
        object structuredData
        object safety
        object metadata
    }

    AI_PLATE_ANALYSIS {
        string analysisId PK
        string userId
        string conversationId FK
        object detectedFoods
        object estimatedNutrition
        string confidence
        object imageMetadata
        date createdAt
    }

    AI_WEEKLY_MENU_PLAN {
        string planId PK
        string userId
        string status
        numeric requestedDays
        numeric completedDays
        date createdAt
        date updatedAt
    }

    AI_WEEKLY_MENU_DAY {
        string dayId PK
        string planId FK
        numeric dayNumber
        string status
        object meals
        object nutritionTotals
    }

    AI_CACHE_ENTRY {
        string cacheKey PK
        string interactionType
        string provider
        string model
        object response
        numeric hitCount
        date expiresAt
    }

    AI_PROMPT_TEMPLATE {
        string key PK
        string version
        string interactionType
        string systemPrompt
        string userPromptTemplate
        boolean isActive
    }

    USER_ACCOUNT ||--|| PROFILE : has
    PROFILE ||--o{ PROFILE_MEAL : receives
    MEAL ||--o{ PROFILE_MEAL : assigned
    MEAL ||--o{ MEAL_FOOD_ITEM : contains
    FOOD_ITEM ||--o{ MEAL_FOOD_ITEM : composes

    USER_ACCOUNT ||--o{ AI_CONVERSATION : owns
    AI_CONVERSATION ||--o{ AI_MESSAGE : includes
    USER_ACCOUNT ||--o{ AI_PLATE_ANALYSIS : uploads
    AI_CONVERSATION ||--o{ AI_PLATE_ANALYSIS : audits
    USER_ACCOUNT ||--o{ AI_WEEKLY_MENU_PLAN : requests
    AI_WEEKLY_MENU_PLAN ||--o{ AI_WEEKLY_MENU_DAY : contains
    AI_PROMPT_TEMPLATE ||--o{ AI_CACHE_ENTRY : versions
```

Fuente Mermaid independiente: [`diagrams/er-diagram.mmd`](diagrams/er-diagram.mmd).

## 2. Diagrama MongoDB

Este diagrama representa de forma especifica las colecciones del modulo IA en MongoDB, sus campos principales, subdocumentos embebidos e indices relevantes.

```mermaid
erDiagram
    AI_CONVERSATION {
        string conversationId PK "unique"
        string userId "index"
        string title
        string type
        string provider
        string model
        string status
        mixed metadata
        date createdAt
        date updatedAt
    }

    AI_MESSAGE {
        string messageId PK "unique"
        string conversationId FK "index"
        string userId "index"
        string role
        string content
        mixed structuredData
        string provider
        string model
        string promptVersion
        object tokenUsage
        object costEstimate
        object safety
        date createdAt
        date updatedAt
    }

    AI_PLATE_ANALYSIS {
        string analysisId PK "unique"
        string userId "index"
        string mealId "sparse index"
        boolean imageStored
        object imageMetadata
        object[] detectedFoods
        object estimatedNutrition
        string[] assumptions
        string confidenceReason
        object proportions
        string confidence
        string[] recommendations
        string[] warnings
        mixed rawAiResponse
        object futureEmbedding
        date createdAt
        date updatedAt
    }

    AI_WEEKLY_MENU_PLAN {
        string planId PK "unique"
        string userId "index"
        string status "index"
        string objective
        number caloriesTarget
        number proteinTarget
        number carbsTarget
        number fatTarget
        number mealsPerDay
        number totalDays
        string notes
        string plan
        number completedDays
        string provider
        string model
        string promptVersion
        number cacheHits
        number cacheMisses
        number providerCallsPlanned
        number providerCallsCompleted
        mixed errorDetails
        boolean realTokensAvailable
        date createdAt
        date updatedAt
    }

    AI_WEEKLY_MENU_DAY {
        string planId FK "compound unique with dayNumber"
        number dayNumber
        string status
        boolean cached
        string cacheKey
        string responseText
        number dailyCalories
        object[] meals
        string[] recommendations
        string[] warnings
        object safety
        string errorMessage
        string provider
        string model
        string promptVersion
        date createdAt
        date updatedAt
    }

    AI_CACHE_ENTRY {
        string cacheKey PK "unique"
        string type
        string inputHash "index"
        string resultText
        mixed resultJson
        string provider
        string model
        string promptVersion
        date expiresAt "TTL index"
        number hitCount
        date createdAt
        date updatedAt
    }

    AI_PROMPT_TEMPLATE {
        string promptKey "compound unique with version"
        string version
        string type
        string systemPrompt
        string userPromptTemplate
        mixed outputSchema
        boolean isActive
        string notes
        date createdAt
        date updatedAt
    }

    TOKEN_USAGE {
        number inputTokens
        number outputTokens
        number totalTokens
    }

    COST_ESTIMATE {
        number amount
        string currency
    }

    MESSAGE_SAFETY {
        boolean blocked
        string reason
    }

    IMAGE_METADATA {
        string mimeType
        number sizeBytes
        number width
        number height
    }

    DETECTED_FOOD {
        string name
        string estimatedQuantity
        string confidence
    }

    ESTIMATED_NUTRITION {
        object caloriesRange
        object proteinRange
        object carbsRange
        object fatRange
    }

    PLATE_PROPORTIONS {
        string protein
        string carbs
        string vegetables
        string fats
    }

    FUTURE_EMBEDDING {
        number[] embedding
        string embeddingModel
        string embeddingVersion
    }

    WEEKLY_MEAL {
        string name
        string description
        number estimatedCalories
        number estimatedProtein
        number estimatedCarbs
        number estimatedFat
    }

    DAY_SAFETY {
        boolean isOutOfScope
        string[] flags
        string escalationMessage
    }

    AI_CONVERSATION ||--o{ AI_MESSAGE : conversationId
    AI_WEEKLY_MENU_PLAN ||--o{ AI_WEEKLY_MENU_DAY : planId
    AI_PROMPT_TEMPLATE ||--o{ AI_CACHE_ENTRY : promptVersion

    AI_MESSAGE ||--|| TOKEN_USAGE : embeds
    AI_MESSAGE ||--|| COST_ESTIMATE : embeds
    AI_MESSAGE ||--|| MESSAGE_SAFETY : embeds
    AI_PLATE_ANALYSIS ||--|| IMAGE_METADATA : embeds
    AI_PLATE_ANALYSIS ||--o{ DETECTED_FOOD : embeds
    AI_PLATE_ANALYSIS ||--|| ESTIMATED_NUTRITION : embeds
    AI_PLATE_ANALYSIS ||--|| PLATE_PROPORTIONS : embeds
    AI_PLATE_ANALYSIS ||--|| FUTURE_EMBEDDING : embeds
    AI_WEEKLY_MENU_DAY ||--o{ WEEKLY_MEAL : embeds
    AI_WEEKLY_MENU_DAY ||--|| DAY_SAFETY : embeds
```

Fuente Mermaid independiente: [`diagrams/mongo-schema-diagram.mmd`](diagrams/mongo-schema-diagram.mmd).

## 3. Diagrama de clases / componentes

Este diagrama resume clases, tipos y servicios principales. No pretende listar todos los componentes React, sino representar las dependencias tecnicas relevantes.

```mermaid
classDiagram
    direction LR

    class App {
      +createApp()
      +mountP0Routes()
      +mountAiRoutes()
      +errorHandler()
    }

    class AuthMiddleware {
      +authenticate(req,res,next)
      +requireAdmin(req,res,next)
      +requireSelfOrAdmin(paramName)
    }

    class P0Routes {
      +authRoutes
      +profileRoutes
      +mealRoutes
      +foodItemRoutes
      +userRoutes
    }

    class P0Controllers {
      +authController
      +profileController
      +mealController
      +foodItemController
      +userController
    }

    class P0ModelsPg {
      +userModel
      +profileModel
      +mealModel
      +foodItemModel
      +query()
      +withTransaction()
    }

    class User {
      +number user_id
      +string name
      +string email
      +Role role
    }

    class Profile {
      +number user_id
      +number weight
      +number age
      +number height
      +Gender gender
      +ActivityFactor activityFactor
      +Objective objective
      +number basalMetabolicRate
      +number totalDailyEnergyExpenditure
    }

    class Meal {
      +number meal_id
      +string name
      +number calories
      +number protein
      +number fat
      +number carbs
      +string source
    }

    class AiRouter {
      +postChat()
      +postMenu()
      +postWeeklyMenu()
      +getWeeklyPlan()
      +postProfileExplanation()
      +postPlateAnalysis()
      +getConversations()
      +postLegacyAnalyze()
      +postSaveAnalyzedMeal()
    }

    class AiControllers {
      +postAiChat()
      +postAiMenu()
      +postAiWeeklyMenu()
      +postAiPlateAnalysis()
      +listAiConversations()
      +handleAnalyzePreview()
    }

    class AiServices {
      +runAiChat()
      +runAiMenu()
      +createWeeklyMenuPlan()
      +runAiPlateAnalysis()
      +getAiConversationById()
      +validateAiResponse()
    }

    class AiRepositories {
      +aiConversationRepository
      +aiCacheRepository
      +aiWeeklyMenuRepository
    }

    class AiProviderRouter {
      +generateTextJsonWithFallback()
      +generateImageJson()
      -selectTextProvider()
    }

    class GeminiClient {
      +generateGeminiJson()
      +generateGeminiJsonWithImage()
    }

    class DeepSeekClient {
      +generateDeepSeekJson()
    }

    class NutricoachContextAdapter {
      +buildAiPlateContextFromP0User(userId)
    }

    class AiConversation {
      +string conversationId
      +string userId
      +AiInteractionType type
      +AiConversationStatus status
    }

    class AiMessage {
      +string messageId
      +string conversationId
      +AiRole role
      +string content
      +object structuredData
    }

    class AiPlateAnalysis {
      +string analysisId
      +string userId
      +object detectedFoods
      +object estimatedNutrition
      +AiConfidence confidence
    }

    App --> P0Routes
    App --> AiRouter
    App --> AuthMiddleware
    P0Routes --> P0Controllers
    P0Controllers --> P0ModelsPg
    P0ModelsPg --> User
    P0ModelsPg --> Profile
    P0ModelsPg --> Meal
    AiRouter --> AuthMiddleware
    AiRouter --> AiControllers
    AiControllers --> AiServices
    AiControllers --> NutricoachContextAdapter
    AiServices --> AiRepositories
    AiServices --> AiProviderRouter
    AiProviderRouter --> DeepSeekClient
    AiProviderRouter --> GeminiClient
    AiRepositories --> AiConversation
    AiRepositories --> AiMessage
    AiRepositories --> AiPlateAnalysis
    NutricoachContextAdapter --> P0ModelsPg
```

Fuente Mermaid independiente: [`diagrams/class-diagram.mmd`](diagrams/class-diagram.mmd).

## 4. Diagrama de casos de uso

El diagrama agrupa los casos de uso del MVP. Las acciones IA siempre pasan por backend y requieren JWT salvo registro/login.

```mermaid
flowchart LR
    visitor[Visitante]
    user[Usuario autenticado]
    admin[Administrador]
    aiProvider[Proveedor IA<br/>DeepSeek / Gemini]
    db[(PostgreSQL + MongoDB)]

    subgraph system[NutriCoach AI]
      ucRegister((Registrarse))
      ucLogin((Iniciar sesion))
      ucProfile((Completar perfil nutricional))
      ucDashboard((Consultar dashboard))
      ucManualMeal((Registrar comida manual))
      ucAnalyzePlate((Analizar plato por imagen))
      ucSaveAnalyzed((Guardar comida analizada))
      ucChat((Conversar con asistente IA))
      ucWeeklyMenu((Generar menu semanal))
      ucConversationHistory((Consultar historial IA))
      ucManageCatalog((Gestionar catalogo de comidas/alimentos))
      ucManageUsers((Consultar usuarios))
      ucHealth((Comprobar salud API))
    end

    visitor --> ucRegister
    visitor --> ucLogin

    user --> ucProfile
    user --> ucDashboard
    user --> ucManualMeal
    user --> ucAnalyzePlate
    user --> ucSaveAnalyzed
    user --> ucChat
    user --> ucWeeklyMenu
    user --> ucConversationHistory
    user --> ucHealth

    admin --> ucManageCatalog
    admin --> ucManageUsers
    admin --> ucHealth

    ucLogin -. habilita JWT .-> ucProfile
    ucLogin -. habilita JWT .-> ucDashboard
    ucAnalyzePlate -. incluye .-> ucSaveAnalyzed
    ucChat -. usa .-> aiProvider
    ucWeeklyMenu -. usa .-> aiProvider
    ucAnalyzePlate -. usa .-> aiProvider

    ucProfile -. persiste/lee .-> db
    ucDashboard -. lee .-> db
    ucManualMeal -. persiste .-> db
    ucSaveAnalyzed -. persiste .-> db
    ucConversationHistory -. lee .-> db
    ucWeeklyMenu -. persiste .-> db
    ucChat -. persiste .-> db
```

Fuente Mermaid independiente: [`diagrams/use-case-diagram.mmd`](diagrams/use-case-diagram.mmd).
