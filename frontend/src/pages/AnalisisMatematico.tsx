import { useSearchParams } from 'react-router-dom';
import { GitGraph, Calculator, Layers, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabPanel } from '../components/ui/Table';
import { useAuth } from '../contexts/useAuth';
import { type ModuleKey } from '../lib/permissions';
import { Vectors } from './Vectors';
import { Matrices } from './Matrices';
import { Operations } from './Operations';
import { LinearCombinations } from './LinearCombinations';

const TABS: Array<{ id: string; label: string; icon: React.ReactNode; module: ModuleKey }> = [
  { id: 'vectores', label: 'Vectores', icon: <GitGraph className="w-4 h-4" />, module: 'vectores' },
  { id: 'matrices', label: 'Matrices', icon: <Calculator className="w-4 h-4" />, module: 'matrices' },
  { id: 'operaciones', label: 'Operaciones', icon: <Layers className="w-4 h-4" />, module: 'operaciones' },
  { id: 'combinaciones-lineales', label: 'Combinaciones Lin.', icon: <SlidersHorizontal className="w-4 h-4" />, module: 'combinaciones' },
];

const DEFAULT_TAB = 'vectores';

export function AnalisisMatematico() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleTabs = TABS.filter(tab => can(tab.module));
  const requested = searchParams.get('tab');
  const activeTab = visibleTabs.some(tab => tab.id === requested)
    ? requested!
    : (visibleTabs.find(tab => tab.id === DEFAULT_TAB)?.id || visibleTabs[0]?.id || DEFAULT_TAB);

  const handleChange = (id: string) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Análisis Matemático</h1>
        <p className="text-secondary mt-1">Vectores, matrices y operaciones de álgebra lineal con tus datos</p>
      </div>

      <Tabs tabs={visibleTabs} activeTab={activeTab} onChange={handleChange} />

      <TabPanel id="vectores" activeTab={activeTab}>
        <Vectors />
      </TabPanel>
      <TabPanel id="matrices" activeTab={activeTab}>
        <Matrices />
      </TabPanel>
      <TabPanel id="operaciones" activeTab={activeTab}>
        <Operations />
      </TabPanel>
      <TabPanel id="combinaciones-lineales" activeTab={activeTab}>
        <LinearCombinations />
      </TabPanel>
    </div>
  );
}
