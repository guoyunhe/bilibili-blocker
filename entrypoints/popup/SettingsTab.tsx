interface SettingsTabProps {
  config: Record<string, boolean>;
  onToggle: (name: string, enabled: boolean) => void;
}

function SettingsTab({ config, onToggle }: SettingsTabProps) {
  const enabled = config.hideFloorCard ?? false;

  return (
    <ul className='rule-list'>
      <li className='rule-item'>
        <label className='rule-label'>
          <input
            type='checkbox'
            className='toggle'
            checked={enabled}
            onChange={(event) => onToggle('hideFloorCard', event.target.checked)}
          />
          <span className='rule-name'>{browser.i18n.getMessage('hideFloorCard')}</span>
        </label>
      </li>
    </ul>
  );
}

export default SettingsTab;
