import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeBlock } from '@/components/ui/code-block';

const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();

beforeEach(() => {
  writeText.mockClear();
});

describe('CodeBlock', () => {
  it('renders the code verbatim', () => {
    render(<CodeBlock language="python" code={'policy.act(obs)\n# chunk of k actions'} />);
    expect(screen.getByText(/policy\.act\(obs\)/)).toBeInTheDocument();
  });

  it('copies the code to the clipboard from an accessible button', async () => {
    const user = userEvent.setup();
    // userEvent.setup() installs its own clipboard stub, so define ours after.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<CodeBlock language="python" code="print(1)" />);
    const button = screen.getByRole('button', { name: /copy code/i });
    await user.click(button);
    expect(writeText).toHaveBeenCalledWith('print(1)');
    expect(await screen.findByText(/copied/i)).toBeInTheDocument();
  });

  it('renders an optional filename title', () => {
    render(<CodeBlock language="bash" title="train.py" code="echo ok" />);
    expect(screen.getByText('train.py')).toBeInTheDocument();
  });
});
