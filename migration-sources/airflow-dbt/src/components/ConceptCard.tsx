import { concepts } from '../data/concepts.js';

export function ConceptCard({conceptId}:{conceptId?:string}){
  const concept=concepts.find((item)=>item.id===conceptId)??concepts[0];
  return <div className="concept-card">
    <div className="eyebrow">{concept.product} concept</div><h3>{concept.title}</h3>
    <dl><dt>What it means</dt><dd>{concept.definition}</dd><dt>Why it exists</dt><dd>{concept.why}</dd><dt>Real project</dt><dd>{concept.realProject}</dd><dt>Example</dt><dd><code>{concept.example}</code></dd><dt>Common mistake</dt><dd>{concept.mistake}</dd>{concept.reflection&&<><dt>Reflection</dt><dd>{concept.reflection}</dd></>}</dl>
  </div>;
}
