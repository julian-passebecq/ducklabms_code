import { useState } from 'react';
import type { Experience } from '../types/app';

export function ManageView({ experience }: { experience: Experience }) {
  const [tab, setTab] = useState<'Connections' | 'Integration runtimes' | 'Triggers' | 'Git configuration'>('Connections');
  const rows = {
    Connections: experience === 'azure'
      ? [['LS_AzureBlob', 'Azure Blob Storage', 'AzureIR'], ['LS_AzureSql', 'Azure SQL Database', 'AzureIR'], ['LS_OnPremSql', 'SQL Server', 'SelfHostedIR']]
      : [['CN_ADLS', 'Azure Data Lake Storage Gen2', 'Organizational'], ['CN_Warehouse', 'Fabric Data Warehouse', 'Organizational'], ['CN_ERP_SQL', 'SQL Server', 'Gateway']],
    'Integration runtimes': [['AzureIR', 'Azure', 'Running'], ['SelfHostedIR', 'Self-hosted', 'Online']],
    Triggers: [['TR_Daily_0600', 'Schedule', 'Started'], ['TR_Hourly', 'Schedule', 'Stopped']],
    'Git configuration': [['Repository', 'Training simulator', 'Not connected'], ['Collaboration branch', 'main', '—']]
  }[tab];
  return (
    <div className="manage-page">
      <div className="page-heading"><div><span className="eyebrow">{experience === 'azure' ? 'ADF Manage hub' : 'Fabric workspace settings'}</span><h1>Manage</h1><p>Practice the control-plane objects that pipelines depend on.</p></div><button className="primary-button">+ New</button></div>
      <div className="manage-layout"><aside className="manage-nav">{(['Connections', 'Integration runtimes', 'Triggers', 'Git configuration'] as const).map((t) => <button className={tab === t ? 'active' : ''} key={t} onClick={() => setTab(t)}>{t}</button>)}</aside><main className="manage-content"><div className="manage-content-title"><h2>{tab}</h2><input placeholder={`Search ${tab.toLowerCase()}`} /></div><table className="manage-table"><thead><tr><th>Name</th><th>Type / Value</th><th>Status / Runtime</th><th /></tr></thead><tbody>{rows.map((r) => <tr key={r[0]}><td><strong>{r[0]}</strong></td><td>{r[1]}</td><td>{r[2]}</td><td><button className="text-button">Edit</button></td></tr>)}</tbody></table><div className="learning-box wide"><strong>Learning note</strong><p>{tab === 'Connections' ? 'Connections centralize authentication and endpoint information. Pipelines reference connections rather than embedding passwords or server details.' : tab === 'Integration runtimes' ? 'ADF Integration Runtime defines where data movement and activity dispatch execute. Fabric uses managed connectivity and gateways rather than exposing the exact same ADF management model.' : tab === 'Triggers' ? 'Triggers create pipeline runs on a schedule or event. Keep orchestration state separate from transformation logic.' : 'Source control is part of the authoring lifecycle. This simulator does not connect to a repository; the page exists so you learn where the concept fits.'}</p></div></main></div>
    </div>
  );
}
