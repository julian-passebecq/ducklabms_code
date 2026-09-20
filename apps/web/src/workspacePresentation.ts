export type WorkspacePresentation='studio'|'fabric'|'leetcode';

export interface WorkspacePresentationPreset {
 id:WorkspacePresentation;
 label:string;
 description:string;
 explorer:'workspace'|'notebook'|'focus';
 preferredView:'practice'|'notebook'|'interview';
 requiresExercise:boolean;
}

export const workspacePresentationPresets:readonly WorkspacePresentationPreset[]=[
 {
  id:'studio',
  label:'Studio',
  description:'Full Datapass workbench with project path, catalog and flexible notebook views.',
  explorer:'workspace',
  preferredView:'practice',
  requiresExercise:false,
 },
 {
  id:'fabric',
  label:'Fabric notebook',
  description:'Notebook/files explorer on the left with the same draggable notebook canvas in the center.',
  explorer:'notebook',
  preferredView:'notebook',
  requiresExercise:false,
 },
 {
  id:'leetcode',
  label:'Interview coding',
  description:'Focused problem, editor, result and guidance layout for coding practice.',
  explorer:'focus',
  preferredView:'leetcode',
  requiresExercise:true,
 },
] as const;

export function workspacePresentationPreset(id:WorkspacePresentation):WorkspacePresentationPreset {
 return workspacePresentationPresets.find(preset=>preset.id===id)??workspacePresentationPresets[0];
}

export function preferredPresentationView(id:WorkspacePresentation,currentView:string,hasExercise:boolean):string {
 const preset=workspacePresentationPreset(id);
 if(preset.requiresExercise&&!hasExercise)return currentView;
 if(id==='leetcode'&&hasExercise)return 'leetcode';
 if(id==='fabric'&&currentView==='practice')return 'notebook';
 return currentView;
}
