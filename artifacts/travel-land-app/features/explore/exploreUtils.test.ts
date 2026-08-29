import {
  getExploreFavoriteKey,
  getExplorePriceBounds,
  getNextExploreSort,
  parseExploreRating,
  resolveExploreCategory,
} from './exploreUtils';

describe('Explore utility behavior', () => {
  it('normalizes category labels and route query values', () => {
    expect(resolveExploreCategory('Hotels')).toBe('hotel');
    expect(resolveExploreCategory(['land'])).toBe('property');
    expect(resolveExploreCategory('unknown')).toBe('all');
  });

  it('keeps legacy favorite ids stable while namespacing new discovery types', () => {
    expect(getExploreFavoriteKey({ id: 'coorg', type: 'destination' })).toBe('coorg');
    expect(getExploreFavoriteKey({ id: 'coorg-coffee-trail', type: 'place' })).toBe('place:coorg-coffee-trail');
  });

  it('translates filter chips into API-ready values', () => {
    expect(parseExploreRating('4.5+')).toBe(4.5);
    expect(getExplorePriceBounds('under-5000')).toEqual({ minPrice: 0, maxPrice: 4999 });
    expect(getExplorePriceBounds('over-10000')).toEqual({ minPrice: 10001 });
    expect(getExplorePriceBounds('')).toEqual({});
  });

  it('cycles the quick sort control through supported discovery sorts', () => {
    expect(getNextExploreSort('relevance')).toBe('popularity');
    expect(getNextExploreSort('popularity')).toBe('distance');
    expect(getNextExploreSort('distance')).toBe('relevance');
  });
});