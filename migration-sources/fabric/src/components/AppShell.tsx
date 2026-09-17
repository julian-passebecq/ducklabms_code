import { Button, Tab, TabList, Tooltip } from '@fluentui/react-components';
import type { AzureProduct, CaseStudy, Experience, PageKey } from '../types/app';
import { Icon } from './Icons';

type NavItem = { key: PageKey; label: string; group?: string };

const fabricNav: NavItem[] = [
  { key: 'home', label: 'Learning hub', group: 'Workspace' },
  { key: 'case-study', label: 'Case study brief' },
  { key: 'toolchoice', label: 'Engineering decision lab' },
  { key: 'practice', label: 'Hands-on practice' },
  { key: 'challenge', label: 'End-to-end challenge' },
  { key: 'production', label: 'Production workflow' },
  { key: 'pipeline', label: 'Data pipeline', group: 'Data Factory' },
  { key: 'copyjob', label: 'Copy Job' },
  { key: 'dataflow', label: 'Dataflow Gen2' },
  { key: 'dbt', label: 'dbt Job' },
  { key: 'airflow', label: 'Apache Airflow Job' },
  { key: 'lakehouse', label: 'Lakehouse / OneLake', group: 'Data Engineering' },
  { key: 'notebook', label: 'Notebook / Python + SQL' },
  { key: 'runtime', label: 'Environment / Spark job' },
  { key: 'sql', label: 'Warehouse / T-SQL', group: 'Data Warehouse' },
  { key: 'realtime', label: 'Real-Time Intelligence', group: 'Real-Time' },
  { key: 'data', label: 'Data explorer', group: 'Operations' },
  { key: 'monitor', label: 'Monitoring hub' },
  { key: 'recovery', label: 'Reliability / recovery' },
  { key: 'governance', label: 'Governance / lineage' },
  { key: 'deployment', label: 'Deployment / CI-CD' },
  { key: 'manage', label: 'Connections / settings' }
];

const adfNav: NavItem[] = [
  { key: 'home', label: 'Azure learning hub', group: 'ADF Studio' },
  { key: 'pipeline', label: 'Author pipeline' },
  { key: 'dataflow', label: 'Mapping data flow' },
  { key: 'data', label: 'Datasets / preview' },
  { key: 'monitor', label: 'Monitor' },
  { key: 'manage', label: 'Manage hub' },
  { key: 'dbx-adf-integration', label: 'ADF → Databricks lab', group: 'Integration' }
];

const databricksNav: NavItem[] = [
  { key: 'dbx-home', label: 'Workspace overview', group: 'Azure Databricks' },
  { key: 'case-study', label: 'Case study brief' },
  { key: 'dbx-production', label: 'Production case study' },
  { key: 'dbx-notebook', label: 'Notebook' },
  { key: 'dbx-catalog', label: 'Unity Catalog' },
  { key: 'dbx-compute', label: 'Compute' },
  { key: 'dbx-streaming', label: 'Delta / Auto Loader', group: 'Data Engineering' },
  { key: 'dbx-pipelines', label: 'Lakeflow pipelines' },
  { key: 'dbx-jobs', label: 'Lakeflow Jobs' },
  { key: 'dbx-sql', label: 'SQL Warehouse' },
  { key: 'dbx-monitor', label: 'Monitoring / Spark UI', group: 'Operations' },
  { key: 'dbx-adf-integration', label: 'ADF integration' }
];

export function AppShell({ experience, azureProduct, page, caseStudy, engineMode, onExperience, onAzureProduct, onPage, onEngine, children }: {
  experience: Experience;
  azureProduct: AzureProduct;
  page: PageKey;
  caseStudy: CaseStudy;
  engineMode: string;
  onExperience: (v: Experience) => void;
  onAzureProduct: (v: AzureProduct) => void;
  onPage: (p: PageKey) => void;
  onEngine: () => void;
  children: React.ReactNode;
}) {
  const nav = experience === 'fabric' ? fabricNav : azureProduct === 'adf' ? adfNav : databricksNav;
  const productName = experience === 'fabric' ? 'Microsoft Fabric' : azureProduct === 'adf' ? 'Azure Data Factory' : 'Azure Databricks';
  const productGlyph = experience === 'fabric' ? 'F' : azureProduct === 'adf' ? 'A' : 'DB';

  return (
    <div className={`app-shell experience-${experience} product-${azureProduct}`}>
      <header className="global-header fluent-global-header">
        <div className="waffle" aria-hidden="true">⋮⋮⋮</div>
        <div className="brand-mark"><span>{productGlyph}</span><strong>{productName}</strong></div>
        <div className="header-context"><span>Data Engineering Learning Studio</span><span>/</span><strong>{caseStudy.title}</strong></div>
        <div className="header-actions">
          <Button appearance="subtle" size="small" className="engine-chip fluent-header-button" onClick={onEngine}>◉ {engineMode}</Button>
          <Tooltip content="Learning help" relationship="label"><Button appearance="subtle" size="small" className="header-icon fluent-header-button">?</Button></Tooltip>
          <Tooltip content="Settings" relationship="label"><Button appearance="subtle" size="small" className="header-icon fluent-header-button">⚙</Button></Tooltip>
          <div className="avatar">JP</div>
        </div>
      </header>

      <div className="experience-switch fluent-product-tabs">
        <TabList selectedValue={experience} onTabSelect={(_, data) => onExperience(data.value as Experience)} size="small">
          <Tab value="fabric" icon={<Icon name="fabric" small />}>Microsoft Fabric</Tab>
          <Tab value="azure" icon={<Icon name="azure" small />}>Azure</Tab>
        </TabList>
        {experience === 'azure' && <div className="azure-product-switch fluent-subtabs">
          <TabList selectedValue={azureProduct} onTabSelect={(_, data) => onAzureProduct(data.value as AzureProduct)} size="small">
            <Tab value="adf">Data Factory</Tab>
            <Tab value="databricks">Azure Databricks</Tab>
          </TabList>
        </div>}
        <Button appearance="subtle" size="small" className="future-product" disabled title="Planned next pass"><Icon name="powerbi-placeholder" small /> Power BI · next pass</Button>
        <span className="learning-only">Learning simulator · local data execution active · cloud services simulated</span>
      </div>

      <div className="app-body">
        <nav className="left-rail expanded-rail fluent-left-rail">
          {nav.map((item, index) => {
            const prev = nav[index - 1];
            const showGroup = item.group && item.group !== prev?.group;
            return <div className="rail-item-wrap" key={item.key}>
              {showGroup && <div className="rail-group-label">{item.group}</div>}
              <Button appearance="subtle" className={page === item.key ? 'active' : ''} title={item.label} onClick={() => onPage(item.key)}>
                <Icon name={item.key} small /><span>{item.label}</span>
              </Button>
            </div>;
          })}
        </nav>
        <section className="app-content">{children}</section>
      </div>
    </div>
  );
}
