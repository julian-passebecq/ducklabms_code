export const caseSessionKey = 'pbi-learning-case-sessions-v1';
export const caseProgressKey = 'pbi-learning-case-progress-v1';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readCaseSessions(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(caseSessionKey) || '{}');
    if (!isPlainObject(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isPlainObject(value)));
  } catch { return {}; }
}


export function readCaseProgress(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(caseProgressKey) || '{}');
    if (!isPlainObject(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([, value]) => Number.isInteger(value) && value >= 0));
  } catch { return {}; }
}

export function saveCaseProgress(storage, id, stepIndex) {
  if (!storage || !id || !Number.isInteger(stepIndex) || stepIndex < 0) return;
  try {
    const progress = readCaseProgress(storage);
    progress[id] = stepIndex;
    storage.setItem(caseProgressKey, JSON.stringify(progress));
  } catch {}
}

export function loadCaseProgress(storage, id, stepCount = Infinity) {
  const value = readCaseProgress(storage)[id];
  if (!Number.isInteger(value) || value < 0) return 0;
  const max = Number.isFinite(stepCount) ? Math.max(0, stepCount - 1) : value;
  return Math.min(value, max);
}

export function clearCaseProgress(storage, id) {
  if (!storage || !id) return;
  try {
    const progress = readCaseProgress(storage);
    delete progress[id];
    storage.setItem(caseProgressKey, JSON.stringify(progress));
  } catch {}
}

export function saveCaseSession(storage, id, workspace) {
  if (!storage || !id || !isPlainObject(workspace)) return;
  try {
    const sessions = readCaseSessions(storage);
    sessions[id] = workspace;
    storage.setItem(caseSessionKey, JSON.stringify(sessions));
  } catch {}
}

export function loadCaseSession(storage, id) {
  const session = readCaseSessions(storage)[id];
  return isPlainObject(session) && session.caseStudyId === id ? session : null;
}

export function clearCaseSession(storage, id) {
  if (!storage || !id) return;
  try {
    const sessions = readCaseSessions(storage);
    delete sessions[id];
    storage.setItem(caseSessionKey, JSON.stringify(sessions));
  } catch {}
}

export function clearAllCaseSessions(storage) {
  if (!storage) return;
  try {
    storage.removeItem(caseSessionKey);
    storage.removeItem(caseProgressKey);
  } catch {}
}
