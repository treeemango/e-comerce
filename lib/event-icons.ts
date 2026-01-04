export const EVENT_ICON_KEYS = [
  'bolt',
  'backpack',
  'gift',
  'heart',
  'moon',
  'flag',
  'diamond',
  'fireworks',
  'shopping_bag',
  'truck',
  'star',
  'crown',
  'rocket',
  'savings',
  'flash',
  'calendar',
  'card',
  'package',
  'balloons',
  'confetti',
  'flag_ke',
  'flag_ng',
  'flag_za',
  'flag_tz',
  'flag_ug',
  'flag_gh'
] as const;

export type EventIconKey = (typeof EVENT_ICON_KEYS)[number];

const DEFAULT_ICON: EventIconKey = 'bolt';

export function isEventIconKey(value: unknown): value is EventIconKey {
  return typeof value === 'string' && (EVENT_ICON_KEYS as readonly string[]).includes(value);
}

export function getEventIconSrc(iconKey?: string | null): string {
  const key = isEventIconKey(iconKey) ? iconKey : DEFAULT_ICON;
  return `/event-icons/${key}.svg`;
}
