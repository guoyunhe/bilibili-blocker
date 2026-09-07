import type { RuleSource } from '../../types';

interface RulesTabProps {
  sources: RuleSource[];
  config: Record<string, boolean>;
  refreshing: boolean;
  onToggle: (name: string, enabled: boolean) => void;
  onRefresh: () => void;
}

function RulesTab({ sources, config, refreshing, onToggle, onRefresh }: RulesTabProps) {
  return (
    <>
      <ul className='rule-list'>
        {sources
          .toSorted((a, b) => a.displayName.localeCompare(b.displayName))
          .map((source) => {
            const enabled = config[source.name] ?? true;
            return (
              <li key={source.name} className='rule-item'>
                <label className='rule-label'>
                  <input
                    type='checkbox'
                    className='toggle'
                    checked={enabled}
                    onChange={(event) => onToggle(source.name, event.target.checked)}
                  />
                  <span className='rule-name'>{source.displayName}</span>
                  <span className='rule-count'>{source.count}</span>
                </label>
              </li>
            );
          })}
      </ul>
      <footer className='app-footer'>
        <button className='refresh-btn' onClick={onRefresh} disabled={refreshing}>
          {refreshing ? browser.i18n.getMessage('refreshing') : browser.i18n.getMessage('refresh')}
        </button>
      </footer>
    </>
  );
}

export default RulesTab;
