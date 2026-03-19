import React from 'react';

import '@testing-library/jest-dom';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) => {
    return React.createElement('img', { ...props, alt: props.alt ?? '' });
  },
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: React.ComponentProps<'a'> & {
    href: string;
  }) => {
    return React.createElement('a', { ...props, href }, children);
  },
}));
