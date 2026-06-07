import { useSubmit } from 'react-router';
import { ButtonAction } from '~/components/ButtonAction';
import { SplitButtonDropdown } from '~/components/SplitButtonDropdown';

type ReadStatus = {
  totalComics: number;
  allRead: boolean;
  noneRead: boolean;
};

type ReadButtonState = 'hidden' | 'read-only' | 'unread-only' | 'split';

function readButtonState(readStatus: ReadStatus): ReadButtonState {
  if (readStatus.totalComics === 0) return 'hidden';
  if (readStatus.allRead) return 'unread-only';
  if (readStatus.noneRead) return 'read-only';
  return 'split';
}

type Props = {
  readStatus: ReadStatus;
  action: string;
};

export function ReadStateButtons({ readStatus, action }: Props) {
  const submit = useSubmit();
  const state = readButtonState(readStatus);

  if (state === 'hidden') return null;

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
      {state === 'split' ? (
        <SplitButtonDropdown
          primaryLabel="Mark Series as Read"
          primaryOnClick={() => submit(null, { method: 'POST', action })}
          items={[
            {
              label: 'Mark Series as Unread',
              onClick: () => submit(null, { method: 'DELETE', action }),
            },
          ]}
        />
      ) : state === 'read-only' ? (
        <ButtonAction method="POST" action={action} variant="primary">
          Mark Series as Read
        </ButtonAction>
      ) : (
        <ButtonAction method="DELETE" action={action} variant="secondary">
          Mark Series as Unread
        </ButtonAction>
      )}
    </div>
  );
}
