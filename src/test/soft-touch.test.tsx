import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

afterEach(cleanup);

describe('soft-touch preserves control behavior', () => {
  it('runs an action once and ignores a disabled button', () => {
    const action = vi.fn();
    render(<><Button onClick={action}>Save</Button><Button disabled onClick={action}>Unavailable</Button></>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unavailable' }));
    expect(action).toHaveBeenCalledTimes(1);
  });
  it('preserves link-child navigation and its callback', () => {
    const action = vi.fn();
    render(<Button asChild onClick={action}><a href="#saved">Saved</a></Button>);
    fireEvent.click(screen.getByRole('link', { name: 'Saved' }));
    expect(action).toHaveBeenCalledTimes(1);
  });
  it('changes a switch once with the new boolean', () => {
    const change = vi.fn();
    render(<Switch aria-label="Review" defaultChecked={false} onCheckedChange={change} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Review' }));
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('keeps keyboard tab switching and content selection', () => {
    render(<Tabs defaultValue="one"><TabsList><TabsTrigger value="one">One</TabsTrigger><TabsTrigger value="two">Two</TabsTrigger></TabsList><TabsContent value="one">First panel</TabsContent><TabsContent value="two">Second panel</TabsContent></Tabs>);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Two' }), { key: 'Enter' });
    expect(screen.getByRole('tabpanel').textContent).toBe('Second panel');
  });
});