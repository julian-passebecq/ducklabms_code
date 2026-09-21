/** UI documents and references only. No runtime, credentials, or second catalog. */
export type Layer = 'notebook' | 'dbt' | 'lineage' | 'model' | 'scd' | 'charts' | 'connections' | 'sparklab';
export type Theme = 'fluent' | 'neutral' | 'dark';
export interface DocumentTab {id: string; layer: Layer; title: string}
export interface Pane {id: 'a' | 'b'; tabs: DocumentTab[]; active: string}
export interface StudioSession {
  panes: Pane[]; activePane: 'a' | 'b'; direction: 'horizontal' | 'vertical'; ratio: number;
  collapsed: 'a' | 'b' | null; explorerOpen: boolean; contextOpen: boolean; theme: Theme;
}
import type {ProjectFile,DbtNode,DbtResult,ArtifactBundle,GraphNode,GraphEdge,Graph,Column,ModelTable,Relationship,ColumnMapping,ModelDesign,Scalar,ResultSnapshot,Board} from '../../../../../packages/contracts/src/analytics.ts';
export type {ProjectFile,DbtNode,DbtResult,ArtifactBundle,GraphNode,GraphEdge,Graph,Column,ModelTable,Relationship,ColumnMapping,ModelDesign,Scalar,ResultSnapshot,Board} from '../../../../../packages/contracts/src/analytics.ts';
export interface LabProject {
  schemaVersion: 1; revision: number; title: string; files: ProjectFile[]; selectedFile: string;
  artifacts?: ArtifactBundle; model: ModelDesign; board: Board; session: StudioSession;
  scd: {type: 1 | 2 | 3; step: number; answer: string};
}
export interface Check {id: string; severity: 'error' | 'warning' | 'info'; message: string}
