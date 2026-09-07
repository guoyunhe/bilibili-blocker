import type { UserEntry } from '../../types';

export interface UserListTabProps {
  entries: UserEntry[];
  onRemove: (entry: UserEntry) => void;
}

function UserListTab({ entries, onRemove }: UserListTabProps) {
  return (
    <ul className='user-list'>
      {entries.map((entry) => (
        <li key={entry.uid} className='user-item'>
          <span>
            <strong>{entry.username}</strong>
            <small>{entry.uid}</small>
          </span>
          <button type='button' className='remove-btn' onClick={() => onRemove(entry)}>
            {browser.i18n.getMessage('remove')}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default UserListTab;
