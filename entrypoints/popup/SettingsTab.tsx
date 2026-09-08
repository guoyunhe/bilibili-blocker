interface SettingsTabProps {
  config: Record<string, boolean>;
  onToggle: (name: string, enabled: boolean) => void;
}

function SettingsTab({ config, onToggle }: SettingsTabProps) {
  const settings = [
    { key: 'hideFloorCard', message: 'hideFloorCard' },
    { key: 'hideLiveRecommend', message: 'hideLiveRecommend' },
  ] as const;

  return (
    <ul className='rule-list'>
      {settings.map(({ key, message }) => (
        <li key={key} className='rule-item'>
          <label className='rule-label'>
            <input
              type='checkbox'
              className='toggle'
              checked={config[key] ?? false}
              onChange={(event) => onToggle(key, event.target.checked)}
            />
            <span className='rule-name'>{browser.i18n.getMessage(message)}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export default SettingsTab;
