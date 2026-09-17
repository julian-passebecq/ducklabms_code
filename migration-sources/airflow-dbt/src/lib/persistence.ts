export const storageKeys = {
  theme:'orchestration-studio.theme',
  caseByLab:'orchestration-studio.case-by-lab',
  codePrefix:'orchestration-studio.code.',
  schemaVersion:'orchestration-studio.storage-version',
  mockAnswersPrefix:'orchestration-studio.mock-answers.',
  mockReviewPrefix:'orchestration-studio.mock-review.',
};

export const STORAGE_VERSION='5';

export function loadString(key:string,fallback:string):string{
  try{return localStorage.getItem(key)??fallback;}catch{return fallback;}
}
export function saveString(key:string,value:string):boolean{
  try{localStorage.setItem(key,value);return true;}catch{return false;}
}
export function removeStored(key:string):boolean{
  try{localStorage.removeItem(key);return true;}catch{return false;}
}
export function loadJson<T>(key: string, fallback: T): T {
  try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
export function saveJson(key: string, value: unknown): boolean {
  try{localStorage.setItem(key, JSON.stringify(value));return true;}catch{return false;}
}
export function codeKey(caseId:string,path:string):string { return `${storageKeys.codePrefix}${caseId}.${path}`; }
export function mockAnswersKey(caseId:string):string { return `${storageKeys.mockAnswersPrefix}${caseId}`; }
export function mockReviewKey(caseId:string):string { return `${storageKeys.mockReviewPrefix}${caseId}`; }
export function loadStringRecord(key:string):Record<string,string>{
  const value=loadJson<unknown>(key,{});
  if(!value||typeof value!=='object'||Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
}
export function loadBooleanRecord(key:string):Record<string,boolean>{
  const value=loadJson<unknown>(key,{});
  if(!value||typeof value!=='object'||Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry):entry is [string,boolean]=>typeof entry[1]==='boolean'));
}
export function isLocalStorageUsable():boolean{
  const probe='orchestration-studio.__storage-probe__';
  try{localStorage.setItem(probe,'1');const ok=localStorage.getItem(probe)==='1';localStorage.removeItem(probe);return ok;}catch{return false;}
}
export function markStorageVersion():void{saveString(storageKeys.schemaVersion,STORAGE_VERSION);}
