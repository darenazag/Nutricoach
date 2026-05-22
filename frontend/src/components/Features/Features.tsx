import ensaladaImg from '../../assets/ensaladadepollo.png'
import './Features.css'

function Features() {
  return (
    <section className="features" id="features">
      <div className="features__container">
        <h2 className="features__title">
          Planes de comida personalizados para ti
        </h2>
        <p className="features__subtitle">
          Menús adaptados a tus objetivos, gustos y estilo de vida. Cada plan se ajusta automáticamente a tu progreso.
        </p>

        <div className="features__grid">
          <article className="feature-card feature-card--weekly">
            <div className="feature-card__body">
              <h3 className="feature-card__title">Tu plan semanal</h3>
              <p className="feature-card__desc">
                Diseñados para perder grasa o ganar músculo
              </p>
            </div>
            <div className="feature-card__phone">
              <div className="phone">
                <div className="phone__notch" />
                <div className="phone__status">
                  <span>9:41</span>
                  <div className="phone__status-icons">
                    <span className="phone__dot" />
                    <span className="phone__dot" />
                    <span className="phone__dot" />
                  </div>
                </div>
                <div className="phone__content">
                  <div className="weekly-calendar">
                    {['L','M','X','J','V','S','D'].map(d => (
                      <div key={d} className="weekly-day">
                        <span className="weekly-day__label">{d}</span>
                        <span className="weekly-day__dot" />
                      </div>
                    ))}
                  </div>
                  <div className="weekly-progress">
                    <div className="weekly-progress__header">
                      <span>Calorías Planeadas</span>
                      <span className="weekly-progress__nums">2,105/2,000 kcal</span>
                    </div>
                    <div className="weekly-progress__bar">
                      <div className="weekly-progress__fill" />
                    </div>
                  </div>
                  <div className="weekly-meals">
                    <div className="weekly-meals__item">
                      <div className="weekly-meals__left">
                        <span className="weekly-meals__dot weekly-meals__dot--breakfast" />
                        <div>
                          <span className="weekly-meals__type">Desayuno</span>
                          <span className="weekly-meals__name">Sandwich Doble de Huevos</span>
                        </div>
                      </div>
                      <span className="weekly-meals__cal">520 kcal</span>
                    </div>
                    <div className="weekly-meals__item">
                      <div className="weekly-meals__left">
                        <span className="weekly-meals__dot weekly-meals__dot--lunch" />
                        <div>
                          <span className="weekly-meals__type">Almuerzo</span>
                          <span className="weekly-meals__name">Wrap de Pollo Parrillero</span>
                        </div>
                      </div>
                      <span className="weekly-meals__cal">680 kcal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="feature-card feature-card--recipes">
            <div className="feature-card__body">
              <h3 className="feature-card__title">Recetas Inteligentes</h3>
              <p className="feature-card__desc">
                Miles de recetas para cumplir tus macros
              </p>
            </div>
            <div className="feature-card__phone">
              <div className="phone">
                <div className="phone__notch" />
                <div className="phone__status">
                  <span>9:41</span>
                  <div className="phone__status-icons">
                    <span className="phone__dot" />
                    <span className="phone__dot" />
                    <span className="phone__dot" />
                  </div>
                </div>
                <div className="phone__content">
                  <div className="recipe-image">
                    <img src={ensaladaImg} alt="Ensalada de Pollo, Palta y Col" />
                  </div>
                  <div className="recipe-details">
                    <span className="recipe-name">Ensalada de Pollo, Palta y Col</span>
                    <div className="recipe-macros">
                      <span className="recipe-macro">511 kcal</span>
                      <span className="recipe-macro__sep">|</span>
                      <span className="recipe-macro">45P</span>
                      <span className="recipe-macro__sep">|</span>
                      <span className="recipe-macro">21C</span>
                      <span className="recipe-macro__sep">|</span>
                      <span className="recipe-macro">29G</span>
                    </div>
                    <button className="recipe-btn">Agregar a Almuerzo</button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="feature-card feature-card--shopping">
            <div className="feature-card__body">
              <h3 className="feature-card__title">Listas de compras</h3>
              <p className="feature-card__desc">
                Tu plan convertido en una lista para el súper
              </p>
            </div>
            <div className="feature-card__phone">
              <div className="phone">
                <div className="phone__notch" />
                <div className="phone__status">
                  <span>9:41</span>
                  <div className="phone__status-icons">
                    <span className="phone__dot" />
                    <span className="phone__dot" />
                    <span className="phone__dot" />
                  </div>
                </div>
                <div className="phone__content">
                  <div className="shop-dates">
                    <span>Lun, 6 Ene</span>
                    <span className="shop-dates__arrow">→</span>
                    <span>Mar, 14 Ene</span>
                  </div>
                  <div className="shop-list">
                    <div className="shop-category">
                      <span className="shop-category__title">Carnes, Aves y Pescados</span>
                      <div className="shop-category__item">
                        <span>Huevo (6 und - 330g)</span>
                        <span className="shop-checkbox" />
                      </div>
                      <div className="shop-category__item">
                        <span>Carne (225g)</span>
                        <span className="shop-checkbox" />
                      </div>
                    </div>
                    <div className="shop-category">
                      <span className="shop-category__title">Frutas</span>
                      <div className="shop-category__item">
                        <span>Kiwi (4 und - 300g)</span>
                        <span className="shop-checkbox" />
                      </div>
                      <div className="shop-category__item">
                        <span>Naranja (3 und - 390g)</span>
                        <span className="shop-checkbox" />
                      </div>
                      <div className="shop-category__item">
                        <span>Plátano (7 und - 910g)</span>
                        <span className="shop-checkbox" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Features
