import { useState } from 'react';
import type { TrackedMesocycle, DayLog } from '../lib/tracking/types';
import { exportProgramAsExcel } from '../lib/exports/service';
import { SessionTracker } from './SessionTracker';
import './TrackingView.css';

export type TrackingViewProps = {
  mesocycle: TrackedMesocycle;
  selectedDay?: number;
  onSelectDay: (dayIndex: number | null) => void;
  onUpdateLog: (dayKey: string, dayLog: DayLog) => void;
  onStopTracking: () => void;
};

export function TrackingView({ mesocycle, selectedDay, onSelectDay, onUpdateLog, onStopTracking }: TrackingViewProps) {
  const { program, logs } = mesocycle;
  const [selectedWeek, setSelectedWeek] = useState(() => program.weeks[0]?.weekIndex ?? 0);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportProgramAsExcel(
        program,
        { scope: 'all', detail: 'full', pdfMode: 'compact', paperSize: 'a4', orientation: 'auto', grayscale: false, inkSaver: true, includeLegend: true, includeProgressionChart: false },
        logs,
      );
    } finally {
      setIsExporting(false);
    }
  }

  const week = program.weeks.find((w) => w.weekIndex === selectedWeek);
  const trainingDays = week?.days.filter((d) => d.isTrainingDay) ?? [];

  const day = selectedDay != null ? week?.days.find((d) => d.dayIndex === selectedDay) : undefined;

  return (
    <div className="tracking-view">
      <div className="tracking-sidebar">
        <h2>{mesocycle.name}</h2>
        <nav aria-label="Week navigation">
          <ul className="week-nav">
            {program.weeks.map((w) => {
              const dayKeys = w.days
                .filter((d) => d.isTrainingDay)
                .map((d) => `${w.weekIndex}-${d.dayIndex}`);
              const loggedDays = dayKeys.filter((k) => logs[k]).length;
              const completedDays = dayKeys.filter((k) => {
                const log = logs[k];
                if (!log) return false;
                return Object.values(log.exercises).every((ex) => ex.sets.every((s) => s.completed));
              }).length;
              const allComplete = completedDays === dayKeys.length;
              const hasData = loggedDays > 0;

              return (
                <li key={w.weekIndex}>
                  <button
                    type="button"
                    className={`week-nav-button${selectedWeek === w.weekIndex ? ' is-active' : ''}${allComplete ? ' is-complete' : hasData ? ' has-data' : ''}`}
                    onClick={() => {
                      setSelectedWeek(w.weekIndex);
                      onSelectDay(null);
                    }}
                  >
                    Week {w.weekIndex}
                    <span className="week-progress">
                      {completedDays}/{dayKeys.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <button type="button" className="export-tracking-button" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export Excel'}
        </button>
        <button type="button" className="stop-tracking-button" onClick={onStopTracking}>
          Stop Tracking
        </button>
      </div>

      <div className="tracking-main">
        {selectedDay === undefined && (
          <div className="day-selector">
            <h3>Week {selectedWeek} — {week?.objective}</h3>
            <div className="day-buttons">
              {trainingDays.map((d) => {
                const dayKey = `${d.weekIndex}-${d.dayIndex}`;
                const log = logs[dayKey];
                const hasData = !!log;
                const isComplete = hasData && Object.values(log.exercises).every((ex) => ex.sets.every((s) => s.completed));
                return (
                  <button
                    key={d.dayIndex}
                    type="button"
                    className={`day-select-button type-${d.sessionType}${isComplete ? ' is-complete' : hasData ? ' has-data' : ''}`}
                    onClick={() => onSelectDay(d.dayIndex)}
                  >
                    <strong>{d.dateLabel}</strong>
                    <span>{d.workout?.title ?? d.sessionType}</span>
                    {isComplete && <span className="check-mark">Done</span>}
                    {hasData && !isComplete && <span className="in-progress-mark">In progress</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedDay != null && day?.workout && (
          <>
            <button type="button" className="back-button" onClick={() => onSelectDay(null)}>
              Back to days
            </button>
            <SessionTracker
              program={program}
              logs={logs}
              weekIndex={selectedWeek}
              dayIndex={selectedDay}
              onSave={(dayLog) => onUpdateLog(`${selectedWeek}-${selectedDay}`, dayLog)}
            />
          </>
        )}
      </div>
    </div>
  );
}
