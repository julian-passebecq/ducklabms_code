import { useEffect, useState } from 'react';
import type { SampleDataset } from '../types.js';

interface Props{
  datasets:SampleDataset[];
  selectedId?:string;
  onSelect?:(id:string)=>void;
}

export function DataPreview({datasets,selectedId,onSelect}:Props){
  const [internalSelected,setInternalSelected]=useState(datasets[0]?.id??'');
  const selected=selectedId??internalSelected;
  const data=datasets.find((item)=>item.id===selected)??datasets[0];

  useEffect(()=>{
    if(selectedId===undefined && !datasets.some((item)=>item.id===internalSelected)) setInternalSelected(datasets[0]?.id??'');
  },[datasets,selectedId,internalSelected]);

  if(!data)return <div className="empty-state"><strong>No sample dataset</strong><span>Scratch mode starts without bound sample data.</span></div>;
  const choose=(id:string)=>{if(onSelect)onSelect(id);else setInternalSelected(id);};
  return <div className="data-preview">
    <div className="subtoolbar"><label>Dataset <select value={data.id} onChange={(event)=>choose(event.target.value)}>{datasets.map((d)=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label><span>{data.description}</span></div>
    <div className="table-scroll"><table><thead><tr>{data.columns.map((col)=><th key={col}>{col}</th>)}</tr></thead><tbody>{data.rows.map((row,index)=><tr key={index}>{data.columns.map((col)=><td key={col}>{String(row[col]??'NULL')}</td>)}</tr>)}</tbody></table></div>
    <p className="truth-note">Sample rows are static teaching data. No warehouse query is executed.</p>
  </div>;
}
