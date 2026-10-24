import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

import type { UserEntry } from '../../types';

export interface UserListTabProps {
  entries: UserEntry[];
  onRemove: (entry: UserEntry) => void;
}

const ITEM_HEIGHT = 56;

function UserListTab({ entries, onRemove }: UserListTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 6,
  });

  return (
    <div ref={scrollRef} className='user-list-scroll'>
      <ul className='user-list' style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const entry = entries[virtualRow.index];
          if (!entry) return null;

          return (
            <li
              key={entry.uid}
              className='user-item'
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <span>
                <strong>
                  <a
                    href={`https://space.bilibili.com/${entry.uid}`}
                    target='_blank'
                    rel='noreferrer'
                  >
                    {entry.username}
                  </a>
                </strong>
                <small>{entry.uid}</small>
              </span>
              <button type='button' className='remove-btn' onClick={() => onRemove(entry)}>
                {browser.i18n.getMessage('remove')}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default UserListTab;
