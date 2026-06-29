// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ReadStateButtons } from './ReadStateButtons';

type ReadStatus = React.ComponentProps<typeof ReadStateButtons>['readStatus'];

function renderButtons(readStatus: ReadStatus) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <ReadStateButtons readStatus={readStatus} action="/series/abc/read" />,
    },
  ]);
  render(<RouterProvider router={router} />);
}

describe('ReadStateButtons', () => {
  it('renders nothing when there are no comics', () => {
    renderButtons({ totalComics: 0, allRead: false, noneRead: true });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows only Mark as Read when nothing has been read', () => {
    renderButtons({ totalComics: 5, allRead: false, noneRead: true });
    expect(screen.getByRole('button', { name: 'Mark Series as Read' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark Series as Unread' })).toBeNull();
  });

  it('shows only Mark as Unread when everything has been read', () => {
    renderButtons({ totalComics: 5, allRead: true, noneRead: false });
    expect(screen.queryByRole('button', { name: 'Mark Series as Read' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Mark Series as Unread' })).toBeInTheDocument();
  });

  describe('when partially read', () => {
    it('shows Mark as Read as the primary action', () => {
      renderButtons({ totalComics: 5, allRead: false, noneRead: false });
      expect(screen.getByRole('button', { name: 'Mark Series as Read' })).toBeInTheDocument();
    });

    it('shows Mark as Unread in the dropdown', () => {
      renderButtons({ totalComics: 5, allRead: false, noneRead: false });
      const toggle = screen.getByRole('button', { name: 'Toggle dropdown' });
      fireEvent.click(toggle);
      expect(screen.getByRole('menuitem', { name: 'Mark Series as Unread' })).toBeInTheDocument();
    });
  });
});
