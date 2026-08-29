import type { ExploreItem, ExploreItemType, SearchExploreSort } from '@workspace/api-client-react';

const categoryAliases: Record<string, ExploreItemType | 'all'> = {
  all: 'all',
  destination: 'destination',
  destinations: 'destination',
  place: 'place',
  places: 'place',
  temple: 'temple',
  temples: 'temple',
  attraction: 'attraction',
  attractions: 'attraction',
  event: 'event',
  events: 'event',
  food: 'food',
  foods: 'food',
  hotel: 'hotel',
  hotels: 'hotel',
  property: 'property',
  properties: 'property',
  land: 'property',
};

export const exploreSortCycle: SearchExploreSort[] = ['relevance', 'popularity', 'distance'];

export function resolveExploreCategory(value?: string | string[]): ExploreItemType | 'all' {
  const first = Array.isArray(value) ? value[0] : value;
  return categoryAliases[(first ?? 'all').toLowerCase()] ?? 'all';
}

export function getExploreFavoriteKey(item: Pick<ExploreItem, 'id' | 'type'>) {
  return ['destination', 'hotel', 'property'].includes(item.type) ? item.id : `${item.type}:${item.id}`;
}

export function parseExploreRating(value: string) {
  const parsed = Number(value.replace('+', ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getExplorePriceBounds(value: string) {
  if (value === 'under-5000') return { minPrice: 0, maxPrice: 4999 };
  if (value === '5000-10000') return { minPrice: 5000, maxPrice: 10000 };
  if (value === 'over-10000') return { minPrice: 10001 };
  return {};
}

export function getNextExploreSort(sort: SearchExploreSort) {
  const currentIndex = exploreSortCycle.indexOf(sort);
  return exploreSortCycle[(currentIndex + 1) % exploreSortCycle.length];
}