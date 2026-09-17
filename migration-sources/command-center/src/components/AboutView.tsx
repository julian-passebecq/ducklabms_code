import { Text } from '@fluentui/react-components'
import { AppIcon } from './AppIcon'

export function AboutView() {
  return (
    <section className="content-page">
      <div className="content-page__header">
        <div>
          <span className="page-eyebrow">ABOUT THE PORTFOLIO</span>
          <Text as="h1" size={700} weight="semibold">A product-style index of technical work</Text>
          <p>Project Command Center turns a large collection of cloud, data, AI and visualization projects into one consistent showcase with clear delivery state and direct technical evidence.</p>
        </div>
      </div>

      <div className="about-grid">
        <article className="about-card about-card--wide">
          <div className="about-card__icon"><AppIcon name="cube" size={24} /></div>
          <div>
            <h2>One catalog, multiple project families</h2>
            <p>The interface keeps Microsoft Cloud at the front while still exposing AI development tools, data engineering, visualization, learning products, portfolio surfaces, industry case studies and utilities through the same project model.</p>
          </div>
        </article>
        <article className="about-card">
          <div className="about-card__icon"><AppIcon name="check" size={24} /></div>
          <div>
            <h2>Clear delivery semantics</h2>
            <p><strong>Live</strong>, <strong>In progress</strong>, <strong>Prototype</strong>, <strong>Planned</strong>, <strong>Concept</strong> and <strong>Legacy</strong> are deliberately separate so unfinished work is not presented as released.</p>
          </div>
        </article>
        <article className="about-card">
          <div className="about-card__icon"><AppIcon name="github" size={24} /></div>
          <div>
            <h2>Evidence over marketing copy</h2>
            <p>Project cards surface repository availability, live-demo availability, current stage, technology and concrete capabilities before longer descriptive text.</p>
          </div>
        </article>
        <article className="about-card">
          <div className="about-card__icon"><AppIcon name="cloud" size={24} /></div>
          <div>
            <h2>Microsoft Cloud first</h2>
            <p>The default view prioritizes Azure, Fabric, Power BI and related data-engineering work because that is the strongest professional organizing axis for the portfolio.</p>
          </div>
        </article>
        <article className="about-card">
          <div className="about-card__icon"><AppIcon name="drop" size={24} /></div>
          <div>
            <h2>Professional domain treatment</h2>
            <p>Energy is represented as a data domain through source systems, pipelines, transformations and KPIs. Domain icons remain small identifiers rather than decorative illustrations.</p>
          </div>
        </article>
      </div>
    </section>
  )
}
