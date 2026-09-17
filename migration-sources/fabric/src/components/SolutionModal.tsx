import type { TutorialStep } from '../types/app';

export function SolutionModal({ step, onClose, onApply }: { step: TutorialStep | null; onClose: () => void; onApply: (step: TutorialStep) => void }) {
  if (!step) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card solution-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header"><div><span className="eyebrow">Step solution</span><h2>{step.title}</h2></div><button className="icon-button" onClick={onClose}>×</button></div>
        <div className="solution-content"><div className="solution-callout"><strong>Expected configuration</strong><p>{step.solutionText}</p></div><div className="learning-box wide"><strong>Reasoning</strong><p>{step.why}</p></div><p className="solution-warning">Use Apply solution when you want the simulator to add/configure the expected activity automatically. You can then inspect the canvas and properties to see what changed.</p></div>
        <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button><button className="primary-button" onClick={() => onApply(step)}>Apply solution</button></div>
      </section>
    </div>
  );
}
