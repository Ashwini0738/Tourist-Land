export const localImages: Record<string, any> = {
  coastline: require('@/assets/images/coastline.jpg'),
  highlands: require('@/assets/images/highlands.jpg'),
};

export function getImageSource(imageKey: string | undefined | null) {
  if (!imageKey) return localImages.highlands;
  return localImages[imageKey] || localImages.highlands;
}