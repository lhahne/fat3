import type { AppView, TrackedMesocycle } from '../lib/tracking/types';

export type TabBarProps = {
  activeView: AppView;
  mesocycles: TrackedMesocycle[];
  onSelectView: (view: AppView) => void;
};

export function TabBar({ activeView, mesocycles, onSelectView }: TabBarProps) {
  const isPlannerActive = activeView === 'planner';

  return (
    <div className="tab-bar" role="tablist" aria-label="Application views">
      <button
        role="tab"
        type="button"
        className={`tab-button${isPlannerActive ? ' is-active' : ''}`}
        aria-selected={isPlannerActive}
        onClick={() => onSelectView('planner')}
      >
        Planner
      </button>
      {mesocycles.map((meso) => {
        const isActive = typeof activeView === 'object' && activeView.tracking === meso.id;
        return (
          <button
            key={meso.id}
            role="tab"
            type="button"
            className={`tab-button${isActive ? ' is-active' : ''}`}
            aria-selected={isActive}
            onClick={() => onSelectView({ tracking: meso.id })}
          >
            {meso.name}
          </button>
        );
      })}
    </div>
  );
}
