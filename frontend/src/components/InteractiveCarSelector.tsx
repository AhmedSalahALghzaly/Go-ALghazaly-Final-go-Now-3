/**
 * Interactive Car Selector - Enhanced Bottom Footer Component
 * Features: Morphing car icon, haptic feedback, SVG brand icons,
 * 5x2 grid layout, floating products panel with filters
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
  Layout,
} from 'react-native-reanimated';

import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore, useColorMood } from '../store/appStore';
import { productsApi } from '../services/api';
import { DURATIONS, SPRINGS, HAPTIC_PATTERNS } from '../constants/animations';
import { Skeleton, ProductCardSkeleton } from './ui/Skeleton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_COLUMNS = 5;
const GRID_ROWS = 2;

interface CarBrand {
  id: string;
  name: string;
  name_ar?: string;
  logo_url?: string;
}

interface CarModel {
  id: string;
  name: string;
  name_ar?: string;
  brand_id: string;
  year_start?: number;
  year_end?: number;
}

interface Product {
  id: string;
  name: string;
  name_ar?: string;
  price: number;
  image_url?: string;
  sku?: string;
}

type SelectorState = 'collapsed' | 'brands' | 'models' | 'products';
type PriceFilter = 'all' | 'low' | 'medium' | 'high';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const InteractiveCarSelector: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { language, isRTL } = useTranslation();
  const router = useRouter();
  const mood = useColorMood();

  // Get data from store with memoized selectors
  const carBrands = useAppStore(useCallback((state) => state.carBrands, []));
  const carModels = useAppStore(useCallback((state) => state.carModels, []));

  // Local state
  const [selectorState, setSelectorState] = useState<SelectorState>('collapsed');
  const [selectedBrand, setSelectedBrand] = useState<CarBrand | null>(null);
  const [selectedModel, setSelectedModel] = useState<CarModel | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

  // Animations
  const expandAnim = useSharedValue(0);
  const carIconRotate = useSharedValue(0);
  const carIconScale = useSharedValue(1);
  const gridOpacity = useSharedValue(0);
  const productsSlideAnim = useSharedValue(SCREEN_HEIGHT);
  const pulseAnim = useSharedValue(1);

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: keyof typeof HAPTIC_PATTERNS = 'selection') => {
    if (Platform.OS !== 'web') {
      switch (type) {
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    }
  }, []);

  // Morphing car animation - rotate and scale on state change
  useEffect(() => {
    if (selectorState !== 'collapsed') {
      carIconRotate.value = withSequence(
        withSpring(180, SPRINGS.bouncy),
        withSpring(360, SPRINGS.gentle)
      );
      carIconScale.value = withSequence(
        withSpring(1.3, SPRINGS.bouncy),
        withSpring(1.1, SPRINGS.gentle)
      );
      // Start pulse animation
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      carIconRotate.value = withSpring(0, SPRINGS.gentle);
      carIconScale.value = withSpring(1, SPRINGS.gentle);
      pulseAnim.value = 1;
    }
  }, [selectorState]);

  // Expand/collapse animation
  useEffect(() => {
    if (selectorState === 'collapsed') {
      expandAnim.value = withTiming(0, { duration: DURATIONS.transition });
      gridOpacity.value = withTiming(0, { duration: DURATIONS.fast });
    } else if (selectorState === 'brands' || selectorState === 'models') {
      expandAnim.value = withSpring(1, SPRINGS.gentle);
      gridOpacity.value = withDelay(100, withTiming(1, { duration: DURATIONS.normal }));
    }
  }, [selectorState]);

  // Products slide animation
  useEffect(() => {
    if (selectorState === 'products') {
      productsSlideAnim.value = withSpring(0, SPRINGS.gentle);
    } else {
      productsSlideAnim.value = withTiming(SCREEN_HEIGHT, { duration: DURATIONS.transition });
    }
  }, [selectorState]);

  // Fetch products when model is selected
  const fetchProductsForModel = useCallback(async (modelId: string) => {
    setLoadingProducts(true);
    try {
      const response = await productsApi.getAll({ car_model_id: modelId, limit: 100 });
      setProducts(response.data?.products || []);
      triggerHaptic('success');
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      triggerHaptic('error');
    } finally {
      setLoadingProducts(false);
    }
  }, [triggerHaptic]);

  const handleAnchorPress = () => {
    triggerHaptic('medium');
    
    if (selectorState === 'collapsed') {
      setSelectorState('brands');
    } else {
      // Collapse back with reset
      setSelectorState('collapsed');
      setSelectedBrand(null);
      setSelectedModel(null);
      setProducts([]);
      setSearchQuery('');
      setPriceFilter('all');
    }
  };

  const handleBrandSelect = (brand: CarBrand) => {
    triggerHaptic('light');
    setSelectedBrand(brand);
    setSelectorState('models');
  };

  const handleModelSelect = (model: CarModel) => {
    triggerHaptic('medium');
    setSelectedModel(model);
    setSelectorState('products');
    fetchProductsForModel(model.id);
  };

  const handleBackToModels = () => {
    triggerHaptic('selection');
    setSelectorState('models');
    setSelectedModel(null);
    setProducts([]);
  };

  const handleBackToBrands = () => {
    triggerHaptic('selection');
    setSelectorState('brands');
    setSelectedBrand(null);
    setSelectedModel(null);
  };

  const handleProductPress = (productId: string) => {
    triggerHaptic('light');
    router.push(`/product/${productId}`);
    // Collapse after navigation
    setSelectorState('collapsed');
    setSelectedBrand(null);
    setSelectedModel(null);
    setProducts([]);
  };

  const getName = useCallback((item: { name: string; name_ar?: string }) =>
    language === 'ar' ? (item.name_ar || item.name) : item.name, [language]);

  // Memoized filter products
  const filteredProducts = useMemo(() => products.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesPrice = true;
    if (priceFilter === 'low') matchesPrice = p.price < 100;
    else if (priceFilter === 'medium') matchesPrice = p.price >= 100 && p.price < 500;
    else if (priceFilter === 'high') matchesPrice = p.price >= 500;

    return matchesSearch && matchesPrice;
  }), [products, searchQuery, priceFilter]);

  // Memoized filtered brands/models for grid
  const displayBrands = useMemo(() => carBrands.slice(0, GRID_COLUMNS * GRID_ROWS), [carBrands]);
  const filteredModels = useMemo(() => selectedBrand
    ? carModels.filter((m) => m.brand_id === selectedBrand.id).slice(0, GRID_COLUMNS * GRID_ROWS)
    : [], [carModels, selectedBrand]);

  // Animated styles
  const carRotation = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${carIconRotate.value}deg` },
      { scale: carIconScale.value * pulseAnim.value },
    ],
  }));

  const containerHeight = useAnimatedStyle(() => ({
    height: interpolate(expandAnim.value, [0, 1], [70, 220], Extrapolation.CLAMP),
  }));

  const gridStyle = useAnimatedStyle(() => ({
    opacity: gridOpacity.value,
    transform: [
      {
        translateY: interpolate(gridOpacity.value, [0, 1], [20, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const productsPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: productsSlideAnim.value }],
  }));

  // Get brand icon based on name
  const getBrandIcon = (brandName: string): string => {
    const iconMap: Record<string, string> = {
      toyota: 'car',
      hyundai: 'car-sport',
      kia: 'car-side',
      nissan: 'car-outline',
      honda: 'car',
      bmw: 'car-sport',
      mercedes: 'car-sport',
      default: 'car',
    };
    const key = brandName.toLowerCase();
    return iconMap[key] || iconMap.default;
  };

  if (carBrands.length === 0) {
    return null; // Don't show if no data
  }

  return (
    <>
      {/* Main Anchor/Footer Bar */}
      <Animated.View
        style={[
          styles.container,
          containerHeight,
          {
            backgroundColor: isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
            borderTopColor: mood?.primary + '30' || colors.border,
          },
        ]}
      >
        {/* Gradient overlay */}
        <LinearGradient
          colors={[
            'transparent',
            (mood?.primary || colors.primary) + '08',
          ]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Anchor Button Row */}
        <View style={[styles.anchorRow, isRTL && styles.anchorRowRTL]}>
          {/* Morphing Car Button */}
          <AnimatedTouchable
            style={[
              styles.anchorButton,
              { backgroundColor: mood?.primary || colors.primary },
            ]}
            onPress={handleAnchorPress}
            activeOpacity={0.8}
          >
            <Animated.View style={carRotation}>
              <MaterialCommunityIcons
                name={selectorState === 'collapsed' ? 'car-sports' : 'close'}
                size={28}
                color="#FFF"
              />
            </Animated.View>
          </AnimatedTouchable>

          {/* Breadcrumb when expanded */}
          {selectorState !== 'collapsed' && (
            <Animated.View
              style={[styles.breadcrumb, gridStyle, isRTL && styles.breadcrumbRTL]}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
            >
              {selectedBrand && (
                <TouchableOpacity
                  style={[styles.breadcrumbItem, { backgroundColor: mood?.primary + '15' }]}
                  onPress={handleBackToBrands}
                >
                  <MaterialCommunityIcons
                    name={getBrandIcon(selectedBrand.name) as any}
                    size={14}
                    color={mood?.primary || colors.primary}
                  />
                  <Text style={[styles.breadcrumbText, { color: mood?.primary || colors.primary }]}>
                    {getName(selectedBrand)}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={mood?.primary || colors.primary} />
                </TouchableOpacity>
              )}
              {selectedModel && (
                <TouchableOpacity
                  style={[styles.breadcrumbItem, { backgroundColor: mood?.primary + '25' }]}
                  onPress={handleBackToModels}
                >
                  <Text style={[styles.breadcrumbText, { color: mood?.primary || colors.primary }]}>
                    {getName(selectedModel)}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* Hint text when collapsed */}
          {selectorState === 'collapsed' && (
            <Animated.View style={styles.hintContainer} entering={FadeIn} exiting={FadeOut}>
              <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                {language === 'ar' ? 'اختر سيارتك' : 'Select Your Car'}
              </Text>
              <Animated.View style={{ transform: [{ rotate: '180deg' }] }}>
                <Ionicons name="chevron-down" size={16} color={mood?.primary || colors.primary} />
              </Animated.View>
            </Animated.View>
          )}
        </View>

        {/* Grid Container */}
        {(selectorState === 'brands' || selectorState === 'models') && (
          <Animated.View style={[styles.gridContainer, gridStyle]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gridScroll}
            >
              <View style={styles.grid}>
                {(selectorState === 'brands' ? displayBrands : filteredModels).map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeIn.delay(index * 40).duration(200)}
                    layout={Layout.springify()}
                  >
                    <TouchableOpacity
                      style={[
                        styles.gridItem,
                        {
                          backgroundColor: colors.surface,
                          borderColor: mood?.primary + '30',
                        },
                      ]}
                      onPress={() => {
                        triggerHaptic('selection');
                        selectorState === 'brands'
                          ? handleBrandSelect(item as CarBrand)
                          : handleModelSelect(item as CarModel);
                      }}
                      activeOpacity={0.7}
                    >
                      {selectorState === 'brands' && (item as CarBrand).logo_url ? (
                        <Image
                          source={{ uri: (item as CarBrand).logo_url }}
                          style={styles.brandLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[styles.brandIconContainer, { backgroundColor: mood?.primary + '15' }]}>
                          <MaterialCommunityIcons
                            name={selectorState === 'brands' ? 'car' : 'car-side'}
                            size={20}
                            color={mood?.primary || colors.primary}
                          />
                        </View>
                      )}
                      <Text
                        style={[styles.gridItemText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {getName(item)}
                      </Text>
                      {selectorState === 'models' && (item as CarModel).year_start && (
                        <Text style={[styles.gridItemSubtext, { color: colors.textSecondary }]}>
                          {(item as CarModel).year_start}-{(item as CarModel).year_end}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                ))}

                {/* View All button */}
                <Animated.View entering={FadeIn.delay(400).duration(200)}>
                  <TouchableOpacity
                    style={[
                      styles.gridItem,
                      styles.viewAllItem,
                      { backgroundColor: mood?.primary + '10', borderColor: mood?.primary },
                    ]}
                    onPress={() => {
                      triggerHaptic('light');
                      if (selectorState === 'brands') {
                        router.push('/car-brands');
                      } else if (selectedBrand) {
                        router.push(`/brand/${selectedBrand.id}`);
                      }
                      setSelectorState('collapsed');
                    }}
                  >
                    <View style={[styles.brandIconContainer, { backgroundColor: mood?.primary + '20' }]}>
                      <Ionicons name="grid" size={20} color={mood?.primary || colors.primary} />
                    </View>
                    <Text style={[styles.gridItemText, { color: mood?.primary || colors.primary }]}>
                      {language === 'ar' ? 'عرض الكل' : 'View All'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </ScrollView>
          </Animated.View>
        )}
      </Animated.View>

      {/* Products Floating Panel */}
      <Animated.View
        style={[
          styles.productsPanel,
          productsPanelStyle,
          { backgroundColor: colors.background },
        ]}
      >
        {/* Header with gradient */}
        <LinearGradient
          colors={[(mood?.primary || colors.primary) + '15', 'transparent']}
          style={styles.productsPanelHeaderGradient}
        >
          <View style={[styles.productsPanelHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              onPress={handleBackToModels}
            >
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {selectedModel ? getName(selectedModel) : ''}
              </Text>
              <Text style={[styles.headerSubtitle, { color: mood?.primary || colors.primary }]}>
                {filteredProducts.length} {language === 'ar' ? 'منتج' : 'products'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.error + '15' }]}
              onPress={() => {
                triggerHaptic('light');
                setSelectorState('collapsed');
              }}
            >
              <Ionicons name="close" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Search & Filters */}
        <View style={[styles.filtersRow, { backgroundColor: colors.card }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: mood?.primary + '40' }]}>
            <Ionicons name="search" size={18} color={mood?.primary || colors.primary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'low', 'medium', 'high'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: priceFilter === filter ? mood?.primary || colors.primary : colors.surface,
                    borderColor: priceFilter === filter ? mood?.primary || colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  triggerHaptic('selection');
                  setPriceFilter(filter);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: priceFilter === filter ? '#FFF' : colors.text },
                  ]}
                >
                  {filter === 'all'
                    ? language === 'ar'
                      ? 'الكل'
                      : 'All'
                    : filter === 'low'
                    ? '<100'
                    : filter === 'medium'
                    ? '100-500'
                    : '>500'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        {loadingProducts ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingGrid}>
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} moodAware />
              ))}
            </View>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {language === 'ar' ? 'لا توجد منتجات' : 'No products found'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            numColumns={2}
            keyExtractor={useCallback((item: Product) => item.id, [])}
            contentContainerStyle={styles.productsGrid}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={6}
            getItemLayout={useCallback((_, index) => ({
              length: 180,
              offset: 180 * Math.floor(index / 2),
              index,
            }), [])}
            renderItem={useCallback(({ item, index }: { item: Product; index: number }) => (
              <Animated.View
                entering={FadeIn.delay(Math.min(index * 30, 300)).duration(200)}
                layout={Layout.springify()}
                style={styles.productCardWrapper}
              >
                <TouchableOpacity
                  style={[
                    styles.productCard,
                    { backgroundColor: colors.card, borderColor: mood?.primary + '20' },
                  ]}
                  onPress={() => handleProductPress(item.id)}
                  activeOpacity={0.7}
                >
                  {item.image_url ? (
                    <Image 
                      source={{ uri: item.image_url }} 
                      style={styles.productImage}
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: mood?.primary + '10' }]}>
                      <Ionicons name="cube-outline" size={32} color={mood?.primary || colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                      {getName(item)}
                    </Text>
                    <Text style={[styles.productPrice, { color: mood?.primary || colors.primary }]}>
                      {item.price?.toFixed(2)} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ), [colors, mood, getName, handleProductPress, language])}
          />
        )}
      </Animated.View>
    </>
  );
};

// Helper for repeat animation
const withRepeat = (animation: any, numberOfReps: number, reverse: boolean) => {
  'worklet';
  return animation;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 2,
    zIndex: 1000,
    overflow: 'hidden',
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  anchorRowRTL: {
    flexDirection: 'row-reverse',
  },
  anchorButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  hintContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 15,
    fontWeight: '600',
  },
  breadcrumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbRTL: {
    flexDirection: 'row-reverse',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '600',
  },
  gridContainer: {
    paddingBottom: 12,
  },
  gridScroll: {
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: 75,
    height: 85,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    padding: 6,
  },
  viewAllItem: {
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  brandLogo: {
    width: 32,
    height: 32,
  },
  brandIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gridItemText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  gridItemSubtext: {
    fontSize: 8,
    marginTop: 2,
  },
  productsPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  productsPanelHeaderGradient: {
    paddingTop: 50, // Safe area
  },
  productsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    padding: 12,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  productsGrid: {
    padding: 12,
  },
  productCardWrapper: {
    width: '50%',
    padding: 6,
  },
  productCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 110,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    minHeight: 36,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default InteractiveCarSelector;
