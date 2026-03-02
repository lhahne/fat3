import { useEffect, useState } from 'react';
import type { ProgramOutput } from '../lib/planner';
import { pathToView, pushView } from '../lib/router';
import type { AppView } from '../lib/tracking/types';
import { useTrackedMesocycles } from '../lib/tracking/useTrackedMesocycles';
import { TabBar } from './TabBar';
import MesocyclePlanner from './MesocyclePlanner';
import { TrackingView } from './TrackingView';
import './AppShell.css';

export function AppShell() {
  const [view, setView] = useState<AppView>('planner');

  // Sync initial view from URL (SSR-safe: deferred to useEffect)
  useEffect(() => {
    setView(pathToView(window.location.pathname));
  }, []);

  // Push URL when view changes
  useEffect(() => {
    pushView(view);
  }, [view]);

  // Handle browser back/forward
  useEffect(() => {
    function onPopState() {
      setView(pathToView(window.location.pathname));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const { mesocycles, startTracking, stopTracking, updateLog } = useTrackedMesocycles();

  function handleStartTracking(program: ProgramOutput) {
    const name = `Mesocycle ${mesocycles.length + 1}`;
    startTracking(program, name);
    // Find the newly created mesocycle (last one)
    // We need to use the updated state, so we'll set view after
    // The hook updates synchronously with setState, but we won't have
    // the new ID yet. Use a workaround by reading localStorage.
    const stored = JSON.parse(window.localStorage.getItem('tracked-mesocycles') ?? '[]');
    const newest = stored[stored.length - 1];
    if (newest) {
      setView({ tracking: newest.id });
    }
  }

  function handleStopTracking(id: string) {
    stopTracking(id);
    setView('planner');
  }

  const activeMesocycle =
    typeof view === 'object' ? mesocycles.find((m) => m.id === view.tracking) : null;

  return (
    <div className="app-shell">
      {mesocycles.length > 0 && (
        <TabBar activeView={view} mesocycles={mesocycles} onSelectView={setView} />
      )}

      {view === 'planner' && (
        <MesocyclePlanner onStartTracking={handleStartTracking} />
      )}

      {activeMesocycle && (
        <TrackingView
          mesocycle={activeMesocycle}
          selectedDay={typeof view === 'object' ? view.day : undefined}
          onSelectDay={(dayIndex) =>
            setView(dayIndex != null
              ? { tracking: activeMesocycle.id, day: dayIndex }
              : { tracking: activeMesocycle.id })
          }
          onUpdateLog={(dayKey, dayLog) => updateLog(activeMesocycle.id, dayKey, dayLog)}
          onStopTracking={() => handleStopTracking(activeMesocycle.id)}
        />
      )}
    </div>
  );
}
