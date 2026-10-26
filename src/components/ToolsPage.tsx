import PageBack from './PageBack';
import { useState } from 'react';
import Metronome from './Metronome';
import Tuner from './Tuner';
import CircleOfFifths from './CircleOfFifths';
import ChordLibrary from './ChordLibrary';

type Tab = 'metronome' | 'tuner' | 'chords' | 'circle';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'metronome', label: 'Metrónomo' },
  { id: 'tuner', label: 'Afinador' },
  { id: 'chords', label: 'Acordes' },
  { id: 'circle', label: 'Círculo' },
];

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('metronome');

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold flex items-center"><PageBack />Herramientas</h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Metrónomo, afinador y teoría musical</p>
      </div>
      <div className="flex gap-2 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.id ? 'var(--card-shadow)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="rounded-3xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
        {activeTab === 'metronome' && <Metronome />}
        {activeTab === 'tuner' && <Tuner />}
        {activeTab === 'chords' && <ChordLibrary />}
        {activeTab === 'circle' && <CircleOfFifths />}
      </div>
    </div>
  );
}
