import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownView } from './MarkdownView';

describe('MarkdownView', () => {
  it('renders single markdown line breaks as visible breaks', () => {
    const { container } = render(<MarkdownView content={'첫 줄\n둘째 줄'} />);
    const paragraph = container.querySelector('.markdown-body p');

    expect(paragraph).toHaveTextContent('첫 줄 둘째 줄');
    expect(container.querySelector('.markdown-body br')).toBeInTheDocument();
  });
});
