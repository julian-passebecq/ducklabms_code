import {Badge} from '@fluentui/react-components';
import type {Profile,SparkSupport} from '../../../packages/contracts/src/index';

export function SparkRuntimeDetails({profile:p,support}:{profile?:Profile;support?:SparkSupport}) {
 if(!p)return null;
 return <details className="spark-runtime-details"><summary>Runtime details · up to {p.executor_count} virtual workers / {p.total_virtual_cores} cores / {p.executor_count*p.executor_memory_gb} GiB</summary>
  <Badge appearance="tint">local semantic result + simulated distributed execution</Badge>
  <p>Driver: {p.driver_cores} cores / {p.driver_memory_gb} GiB. Each executor: {p.executor_cores} cores / {p.executor_memory_gb} GiB. No cloud resources are created.</p>
  <p>Partitions: {p.default_partitions} input / {p.shuffle_partitions} shuffle. Broadcast threshold: {p.broadcast_threshold_mb} MiB. Startup: {p.cold_start_seconds}s. Assumed scan/network throughput: {p.scan_mb_s_per_core}/{p.shuffle_mb_s_per_core} MiB/s/core.</p>
  <p>{p.credits_per_core_hour} fictional Datapass Credits per core-hour, plus memory/shuffle/spill contributions. {p.truth}.</p>
  {support&&<><p>{support.execution}</p><table><thead><tr><th>Supported syntax</th><th>Boundary</th></tr></thead><tbody>{support.supported.map(row=><tr key={row.operation}><td>{row.operation}</td><td>{row.scope}</td></tr>)}</tbody></table><h4>UNAVAILABLE / UNSUPPORTED</h4><ul>{support.unsupported.map(item=><li key={item}>{item}</li>)}</ul></>}
 </details>;
}
