import { go } from '../router';
import { Seg } from '../ui/controls';

/** Route and Departures are two views of the same road: one switch at the top of both. */
export function RouteSwitch({ on }: { on: 'route' | 'departures' }) {
  return (
    <Seg
      options={[
        { id: 'route', label: 'Route' },
        { id: 'departures', label: 'Departures' },
      ]}
      value={on}
      onChange={(v) => v !== on && go(v === 'route' ? '/map' : '/departures')}
    />
  );
}
