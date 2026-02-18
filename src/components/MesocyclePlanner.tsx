import { useEffect, useMemo, useRef, useState } from 'react';
import {
  STRENGTH_PROFILE_LABELS,
  generateProgram,
  getRecommendedDefaults,
  normalizeInputs,
  type DayPlan,
  type Focus,
  type Level,
  type PlannerInputs,
  type StrengthProfile,
} from '../lib/planner';
import { exportProgramAsExcel, exportProgramAsPdf } from '../lib/exports/service';
import type { ExportDetail, ExportOptions, ExportScope, Orientation, PaperSize, PdfMode } from '../lib/exports/types';
import './MesocyclePlanner.css';

type OverriddenFields = {
  mesocycleWeeks: boolean;
  sessionsPerWeek: boolean;
};

const FOCUS_OPTIONS: Array<{ value: Focus; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'mixed', label: 'Mixed' },
];

const LEVEL_OPTIONS: Array<{ value: Level; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const STRENGTH_PROFILE_OPTIONS: Array<{ value: StrengthProfile; label: string }> = [
  { value: 'bodybuilding', label: 'Bodybuilding' },
  { value: 'powerlifting', label: 'Powerlifting' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'endurance-support', label: 'Endurance Support Strength' },
];

function createInitialInputs(): PlannerInputs {
  const defaults = getRecommendedDefaults('beginner', 'strength');
  return normalizeInputs({
    focus: 'strength',
    level: 'beginner',
    mesocycleWeeks: defaults.mesocycleWeeks,
    sessionsPerWeek: defaults.sessionsPerWeek,
    autoDeload: true,
    strengthProfile: 'balanced',
  });
}

function objectiveLabel(objective: string): string {
  if (objective === 'build') return 'Build';
  if (objective === 'push') return 'Push';
  if (objective === 'deload') return 'Deload';
  return 'Taper';
}

function sessionLabel(type: string): string {
  if (type === 'strength') return 'Strength';
  if (type === 'endurance') return 'Endurance';
  if (type === 'mixed') return 'Mixed';
  if (type === 'deload') return 'Deload';
  if (type === 'recovery') return 'Recovery';
  return 'Rest';
}

export default function MesocyclePlanner() {
  const [inputs, setInputs] = useState<PlannerInputs>(createInitialInputs);
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [selectedWeeksText, setSelectedWeeksText] = useState('');
  const [exportDetail, setExportDetail] = useState<ExportDetail>('full');
  const [pdfMode, setPdfMode] = useState<PdfMode>('detailed');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [grayscale, setGrayscale] = useState(false);
  const [inkSaver, setInkSaver] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeProgressionChart, setIncludeProgressionChart] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const exportPdfButtonRef = useRef<HTMLButtonElement | null>(null);
  const modalHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [overridden, setOverridden] = useState<OverriddenFields>({
    mesocycleWeeks: false,
    sessionsPerWeek: false,
  });

  const recommended = useMemo(() => getRecommendedDefaults(inputs.level, inputs.focus), [inputs.level, inputs.focus]);
  const program = useMemo(() => generateProgram(inputs), [inputs]);

  function applyRecommended(level: Level, focus: Focus, preserve: OverriddenFields, current: PlannerInputs): PlannerInputs {
    const defaults = getRecommendedDefaults(level, focus);
    const next: PlannerInputs = {
      ...current,
      level,
      focus,
      mesocycleWeeks: preserve.mesocycleWeeks ? current.mesocycleWeeks : defaults.mesocycleWeeks,
      sessionsPerWeek: preserve.sessionsPerWeek ? current.sessionsPerWeek : defaults.sessionsPerWeek,
      autoDeload: true,
      strengthProfile: current.strengthProfile,
    };

    if (focus === 'mixed') {
      next.mixedBias = current.mixedBias ?? defaults.mixedBias ?? 50;
    } else {
      delete next.mixedBias;
    }

    return normalizeInputs(next);
  }

  function handleFocusChange(value: Focus) {
    setInputs((current) => applyRecommended(current.level, value, overridden, current));
    setSelectedDay(null);
  }

  function handleLevelChange(value: Level) {
    setInputs((current) => applyRecommended(value, current.focus, overridden, current));
    setSelectedDay(null);
  }

  function handleReset() {
    setOverridden({ mesocycleWeeks: false, sessionsPerWeek: false });
    setInputs((current) => {
      const defaults = getRecommendedDefaults(current.level, current.focus);
      return normalizeInputs({
        ...current,
        mesocycleWeeks: defaults.mesocycleWeeks,
        sessionsPerWeek: defaults.sessionsPerWeek,
        mixedBias: current.focus === 'mixed' ? (defaults.mixedBias ?? 50) : undefined,
        autoDeload: true,
      });
    });
    setSelectedDay(null);
  }

  function parseSelectedWeeks(value: string): number[] {
    const weeks = value
      .split(',')
      .map((chunk) => Number(chunk.trim()))
      .filter((week) => Number.isInteger(week) && week >= 1 && week <= program.weeks.length);
    return Array.from(new Set(weeks)).sort((a, b) => a - b);
  }

  function validateSelectedWeeksForExport(): boolean {
    if (exportScope !== 'selected') return true;

    const selectedWeeks = parseSelectedWeeks(selectedWeeksText);
    if (selectedWeeks.length > 0) return true;

    setExportStatus('Please enter at least one valid week number.');
    return false;
  }

  function buildValidatedExportOptions(): ExportOptions | null {
    if (!validateSelectedWeeksForExport()) {
      return null;
    }

    const selectedWeeks = exportScope === 'selected' ? parseSelectedWeeks(selectedWeeksText) : undefined;

    return {
      scope: exportScope,
      selectedWeeks,
      detail: exportDetail,
      pdfMode,
      paperSize,
      orientation,
      grayscale,
      inkSaver,
      includeLegend,
      includeProgressionChart,
    };
  }

  async function handleExcelExport() {
    const options = buildValidatedExportOptions();
    if (!options) return;

    await exportProgramAsExcel(program, options);
    setExportStatus('Exported Excel file.');
  }

  async function handlePdfExport() {
    const options = buildValidatedExportOptions();
    if (!options) return;

    setIsPdfExporting(true);
    try {
      await exportProgramAsPdf(program, options);
      setExportStatus('Exported PDF file.');
      setIsPdfModalOpen(false);
    } finally {
      setIsPdfExporting(false);
    }
  }

  useEffect(() => {
    if (!isPdfModalOpen) return;

    modalHeadingRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || isPdfExporting) return;
      setIsPdfModalOpen(false);
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPdfModalOpen, isPdfExporting]);

  useEffect(() => {
    if (isPdfModalOpen) return;
    exportPdfButtonRef.current?.focus();
  }, [isPdfModalOpen]);

  function handleOpenPdfModal() {
    if (!validateSelectedWeeksForExport()) return;

    setExportStatus(null);
    setIsPdfModalOpen(true);
  }

  function handleClosePdfModal() {
    if (isPdfExporting) return;
    setIsPdfModalOpen(false);
  }

  return (
    <div className="planner-shell">
      <section className="controls" aria-label="Planner controls">
        <h1>Mesocycle Planner</h1>

        <label htmlFor="focus-select">Program focus</label>
        <select
          id="focus-select"
          aria-label="Program focus"
          value={inputs.focus}
          onChange={(event) => handleFocusChange(event.target.value as Focus)}
        >
          {FOCUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label htmlFor="strength-profile-select">Strength profile</label>
        <select
          id="strength-profile-select"
          aria-label="Strength profile"
          value={inputs.strengthProfile}
          onChange={(event) => {
            setInputs((current) => normalizeInputs({ ...current, strengthProfile: event.target.value as StrengthProfile, autoDeload: true }));
            setSelectedDay(null);
          }}
        >
          {STRENGTH_PROFILE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {inputs.focus === 'mixed' && (
          <>
            <label htmlFor="mixed-bias">Mixed bias</label>
            <input
              id="mixed-bias"
              aria-label="Mixed bias"
              type="range"
              min={0}
              max={100}
              step={1}
              value={inputs.mixedBias ?? 50}
              onChange={(event) => {
                setInputs((current) => normalizeInputs({ ...current, mixedBias: Number(event.target.value), autoDeload: true }));
                setSelectedDay(null);
              }}
            />
            <output htmlFor="mixed-bias">{inputs.mixedBias ?? 50}% endurance</output>
          </>
        )}

        <label htmlFor="weeks-input">Mesocycle length (weeks)</label>
        <input
          id="weeks-input"
          aria-label="Mesocycle length (weeks)"
          type="number"
          min={4}
          max={12}
          value={inputs.mesocycleWeeks}
          onChange={(event) => {
            setOverridden((current) => ({ ...current, mesocycleWeeks: true }));
            setInputs((current) => normalizeInputs({ ...current, mesocycleWeeks: Number(event.target.value), autoDeload: true }));
            setSelectedDay(null);
          }}
        />

        <label htmlFor="level-select">Initial fitness level</label>
        <select
          id="level-select"
          aria-label="Initial fitness level"
          value={inputs.level}
          onChange={(event) => handleLevelChange(event.target.value as Level)}
        >
          {LEVEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label htmlFor="sessions-input">Sessions per week</label>
        <input
          id="sessions-input"
          aria-label="Sessions per week"
          type="number"
          min={2}
          max={6}
          value={inputs.sessionsPerWeek}
          onChange={(event) => {
            setOverridden((current) => ({ ...current, sessionsPerWeek: true }));
            setInputs((current) => normalizeInputs({ ...current, sessionsPerWeek: Number(event.target.value), autoDeload: true }));
            setSelectedDay(null);
          }}
        />

        <p className="deload-note">Auto-deload: enabled</p>
        <button type="button" onClick={handleReset}>
          Reset to recommended
        </button>

        <dl className="summary">
          <div>
            <dt>Recommended length</dt>
            <dd>{recommended.mesocycleWeeks} weeks</dd>
          </div>
          <div>
            <dt>Recommended sessions</dt>
            <dd>{recommended.sessionsPerWeek} / week</dd>
          </div>
        </dl>

        <div className="export-controls">
          <label htmlFor="export-scope">Export scope</label>
          <select
            id="export-scope"
            aria-label="Export scope"
            value={exportScope}
            onChange={(event) => setExportScope(event.target.value as ExportScope)}
          >
            <option value="all">All weeks</option>
            <option value="selected">Selected weeks</option>
          </select>

          {exportScope === 'selected' && (
            <>
              <label htmlFor="selected-weeks">Selected weeks</label>
              <input
                id="selected-weeks"
                aria-label="Selected weeks"
                type="text"
                placeholder="e.g. 1,2,5"
                value={selectedWeeksText}
                onChange={(event) => setSelectedWeeksText(event.target.value)}
              />
            </>
          )}

          <label htmlFor="export-detail">Export detail</label>
          <select
            id="export-detail"
            aria-label="Export detail"
            value={exportDetail}
            onChange={(event) => setExportDetail(event.target.value as ExportDetail)}
          >
            <option value="calendar-only">Calendar only</option>
            <option value="full">Calendar + workout details</option>
          </select>

          <button type="button" onClick={handleExcelExport}>
            Export Excel (.xlsx)
          </button>
          <button type="button" onClick={handleOpenPdfModal} ref={exportPdfButtonRef}>
            Export PDF
          </button>
          {exportStatus && <p>{exportStatus}</p>}
        </div>
      </section>

      <section className="calendar" aria-label="Program calendar">
        <div className="weekday-row" aria-hidden="true">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {program.weeks.map((week) => (
          <article key={week.weekIndex} className="week-row">
            <header>
              <h2>Week {week.weekIndex}</h2>
              <p>
                {objectiveLabel(week.objective)} - {week.plannedSessionCount} sessions
              </p>
            </header>
            <div className="day-grid">
              {week.days.map((day) => (
                <button
                  key={`${week.weekIndex}-${day.dayIndex}`}
                  type="button"
                  className={`day-box type-${day.sessionType}`}
                  onClick={() => setSelectedDay(day)}
                  aria-label={`Week ${week.weekIndex}, ${day.dateLabel}, ${sessionLabel(day.sessionType)}, effort ${day.effort} of 5, objective ${week.objective}`}
                >
                  <strong>{day.dateLabel}</strong>
                  <span>{day.workout?.title ?? sessionLabel(day.sessionType)}</span>
                  <span className="effort" aria-hidden="true">
                    {'●'.repeat(day.effort)}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <aside className="day-details" aria-label="Day details">
        <h2>Session details</h2>
        {!selectedDay?.workout && <p>Select a training day to inspect the workout.</p>}
        {selectedDay?.workout && (
          <div className="session-content">
            <p>
              Week {selectedDay.weekIndex} {selectedDay.dateLabel}
            </p>
            <p>{selectedDay.workout.title}</p>
            <p>{sessionLabel(selectedDay.sessionType)}</p>
            {selectedDay.workout.strengthProfile && (
              <p>Profile: {STRENGTH_PROFILE_LABELS[selectedDay.workout.strengthProfile]}</p>
            )}
            {selectedDay.workout.targetMode && <p>Target: {selectedDay.workout.targetMode.toUpperCase()} ({selectedDay.workout.targetValue})</p>}
            {selectedDay.workout.blocks.map((block) => (
              <section key={block.title}>
                <h3>{block.title}</h3>
                <ul>
                  {block.items.map((item) => (
                    <li key={`${block.title}-${item.name}`}>
                      {item.name}: {item.prescription}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </aside>

      {isPdfModalOpen && (
        <div className="modal-backdrop" onClick={handleClosePdfModal}>
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-export-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="pdf-export-modal-title" tabIndex={-1} ref={modalHeadingRef}>
              PDF export settings
            </h2>

            <label htmlFor="pdf-mode">PDF mode</label>
            <select
              id="pdf-mode"
              aria-label="PDF mode"
              value={pdfMode}
              onChange={(event) => setPdfMode(event.target.value as PdfMode)}
            >
              <option value="compact">Compact</option>
              <option value="detailed">Detailed</option>
            </select>

            <label htmlFor="paper-size">Paper size</label>
            <select
              id="paper-size"
              aria-label="Paper size"
              value={paperSize}
              onChange={(event) => setPaperSize(event.target.value as PaperSize)}
            >
              <option value="letter">Letter</option>
              <option value="a4">A4</option>
            </select>

            <label htmlFor="orientation">Orientation</label>
            <select
              id="orientation"
              aria-label="Orientation"
              value={orientation}
              onChange={(event) => setOrientation(event.target.value as Orientation)}
            >
              <option value="auto">Auto</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>

            <label htmlFor="grayscale-toggle">
              <input
                id="grayscale-toggle"
                aria-label="Grayscale"
                type="checkbox"
                checked={grayscale}
                onChange={(event) => setGrayscale(event.target.checked)}
              />
              Grayscale
            </label>

            <label htmlFor="ink-saver-toggle">
              <input
                id="ink-saver-toggle"
                aria-label="Ink saver"
                type="checkbox"
                checked={inkSaver}
                onChange={(event) => setInkSaver(event.target.checked)}
              />
              Ink saver
            </label>

            <label htmlFor="legend-toggle">
              <input
                id="legend-toggle"
                aria-label="Include legend"
                type="checkbox"
                checked={includeLegend}
                onChange={(event) => setIncludeLegend(event.target.checked)}
              />
              Include legend
            </label>

            <label htmlFor="progression-toggle">
              <input
                id="progression-toggle"
                aria-label="Include progression chart"
                type="checkbox"
                checked={includeProgressionChart}
                onChange={(event) => setIncludeProgressionChart(event.target.checked)}
              />
              Include progression chart
            </label>

            <div className="modal-actions">
              <button type="button" onClick={handleClosePdfModal} disabled={isPdfExporting}>
                Cancel
              </button>
              <button type="button" onClick={handlePdfExport} disabled={isPdfExporting}>
                Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
