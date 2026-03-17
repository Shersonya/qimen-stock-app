import React from 'react';

import '@testing-library/jest-dom';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ComponentProps<'img'>) => {
    return React.createElement('img', { ...props, alt: props.alt ?? '' });
  },
}));
