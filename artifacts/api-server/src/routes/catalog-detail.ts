import {
  attractions,
  events,
  foods,
  homeNotice,
  hotels,
  nearby,
  temples,
  destinations,
} from "./catalog-data.ts";

export function getDestinationDetail(id: string) {
  const destination = destinations.find((item) => item.id === id);
  if (!destination) return null;

  const places = Array.from(
    new Map(
      [...attractions, ...temples]
        .filter((item) => item.destinationId === destination.id)
        .map((item) => [item.id, item]),
    ).values(),
  );

  return {
    destination,
    places,
    events: events.filter((item) => item.destinationId === destination.id),
    foods: foods.filter((item) => item.destinationId === destination.id),
    hotels: hotels.filter((item) => item.destinationId === destination.id),
    nearby: nearby.filter((item) => item.destinationId === destination.id),
    sourceNotice: homeNotice,
  };
}