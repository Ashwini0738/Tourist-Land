import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { getImageSource } from '@/features/home/utils/images';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/theme';

type GalleryProps = {
  imageKeys: Array<string | null | undefined>;
  label: string;
  height?: number;
};

function normalizeImages(imageKeys: GalleryProps['imageKeys']) {
  const items = imageKeys.filter((value): value is string => Boolean(value));
  return items.length ? items : ['missing'];
}

export function Gallery({ imageKeys, label, height = 280 }: GalleryProps) {
  const colors = useColors();
  const imageSignature = imageKeys.join('|');
  const images = useMemo(() => normalizeImages(imageKeys), [imageSignature]);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setActiveIndex(0);
    setLoading(true);
  }, [images]);

  const activeImage = images[activeIndex] ?? images[0];
  const isMissing = activeImage === 'missing';

  return (
    <>
      <View
        testID="gallery"
        accessibilityLabel={`${label} gallery, image ${activeIndex + 1} of ${images.length}`}
        style={[styles.container, { height, backgroundColor: colors.secondary }]}
      >
        <Pressable
          testID="gallery-open"
          accessibilityRole="button"
          accessibilityLabel={`Open ${label} gallery`}
          onPress={() => setViewerOpen(true)}
          style={StyleSheet.absoluteFill}
        >
          {isMissing ? (
            <View style={styles.fallback}>
              <Feather name="image" size={34} color={colors.mutedForeground} />
              <Text style={[styles.fallbackTitle, { color: colors.foreground }]}>Image unavailable</Text>
              <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>This listing has no image to show.</Text>
            </View>
          ) : (
            <>
              {loading ? <ActivityIndicator testID="gallery-loading" color={colors.primary} style={styles.loader} /> : null}
              <Image
                source={getImageSource(activeImage)}
                accessibilityLabel={`${label}, image ${activeIndex + 1}`}
                onLoadEnd={() => setLoading(false)}
                onError={() => setLoading(false)}
                style={styles.image}
              />
            </>
          )}
        </Pressable>
        <View pointerEvents="none" style={styles.scrim} />
        <View style={styles.topRow}>
          <View style={[styles.counter, { backgroundColor: 'rgba(18, 35, 28, 0.68)' }]}>
            <Feather name="image" size={12} color="#fff" />
            <Text style={styles.counterText}>{activeIndex + 1} / {images.length}</Text>
          </View>
          <Pressable
            testID="gallery-expand"
            accessibilityRole="button"
            accessibilityLabel={`View ${label} full screen`}
            onPress={() => setViewerOpen(true)}
            style={styles.expand}
          >
            <Feather name="maximize-2" size={16} color="#fff" />
          </Pressable>
        </View>
        {images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnails}
          >
            {images.map((imageKey, index) => (
              <Pressable
                key={`${imageKey}-${index}`}
                testID={`gallery-thumbnail-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`View ${label}, image ${index + 1}`}
                accessibilityState={{ selected: index === activeIndex }}
                onPress={() => {
                  setActiveIndex(index);
                  setLoading(true);
                }}
                style={[
                  styles.thumbnail,
                  { borderColor: index === activeIndex ? colors.accent : 'rgba(255,255,255,0.45)' },
                ]}
              >
                <Image source={getImageSource(imageKey)} style={styles.thumbnailImage} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Modal
        visible={viewerOpen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View testID="gallery-viewer" style={[styles.viewer, { backgroundColor: '#0c1712' }]}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle} numberOfLines={1}>{label}</Text>
            <Pressable
              testID="gallery-close"
              accessibilityRole="button"
              accessibilityLabel="Close gallery"
              onPress={() => setViewerOpen(false)}
              style={styles.close}
            >
              <Feather name="x" size={21} color="#fff" />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: activeIndex * 1000, y: 0 }}
            onMomentumScrollEnd={(event) => {
              const width = event.nativeEvent.layoutMeasurement.width || 1;
              const index = Math.max(0, Math.min(images.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
              setActiveIndex(index);
            }}
            style={styles.viewerScroll}
          >
            {images.map((imageKey, index) => (
              <View key={`${imageKey}-viewer-${index}`} style={[styles.viewerPage, { width }]}>
                {imageKey === 'missing' ? (
                  <View style={styles.fallback}>
                    <Feather name="image" size={42} color="rgba(255,255,255,0.65)" />
                    <Text style={styles.viewerMissing}>Image unavailable</Text>
                  </View>
                ) : (
                  <Image
                    source={getImageSource(imageKey)}
                    accessibilityLabel={`${label}, full-screen image ${index + 1}`}
                    resizeMode="contain"
                    style={styles.viewerImage}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          <Text style={styles.viewerCounter}>{activeIndex + 1} / {images.length}</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radii.lg, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  loader: { position: 'absolute', left: 0, right: 0, top: '46%', zIndex: 1 },
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 76, backgroundColor: 'rgba(12,23,18,0.2)' },
  topRow: { position: 'absolute', left: spacing.md, right: spacing.md, top: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  counterText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  expand: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(12,23,18,0.68)', alignItems: 'center', justifyContent: 'center' },
  thumbnails: { gap: 7, paddingHorizontal: spacing.md, paddingBottom: spacing.md, position: 'absolute', left: 0, right: 0, bottom: 0 },
  thumbnail: { width: 45, height: 37, borderWidth: 2, borderRadius: 9, overflow: 'hidden', backgroundColor: 'rgba(12,23,18,0.5)' },
  thumbnailImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  fallbackTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  fallbackText: { fontSize: 12, textAlign: 'center', marginTop: 5 },
  viewer: { flex: 1, justifyContent: 'center' },
  viewerHeader: { position: 'absolute', top: 54, left: 20, right: 20, zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewerTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '800', marginRight: 14 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  viewerScroll: { flex: 1 },
  viewerPage: { width: 1000, flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '72%' },
  viewerCounter: { position: 'absolute', bottom: 42, alignSelf: 'center', color: '#fff', fontSize: 12, fontWeight: '800' },
  viewerMissing: { color: 'rgba(255,255,255,0.75)', fontSize: 16, marginTop: 12 },
});