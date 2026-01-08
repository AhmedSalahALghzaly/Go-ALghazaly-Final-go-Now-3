import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/appStore';
import { favoritesApi } from '../services/api';
import { AnimatedFavoriteButton, AnimatedCartButton } from './AnimatedIconButton';
import * as Haptics from 'expo-haptics';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    name_ar: string;
    price: number;
    image_url?: string;
    product_brand_id?: string;
    // Enhanced fields for detailed display
    product_brand_name?: string;
    product_brand_name_ar?: string;
    manufacturer_country?: string;
    manufacturer_country_ar?: string;
    sku?: string;
    compatible_car_model?: string;
    compatible_car_model_ar?: string;
    compatible_car_models_count?: number;
  };
  onAddToCart?: (quantity: number) => void;
  cardWidth?: number; // Optional prop to override default width
  showDetails?: boolean; // Optional prop to show/hide extra details (default: true)
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, cardWidth, showDetails = true }) => {
  const { colors } = useTheme();
  const { t, language, isRTL } = useTranslation();
  const router = useRouter();
  const { user } = useAppStore();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  
  // Animation refs
  const priceScaleAnim = useRef(new Animated.Value(1)).current;
  const quantityBounceAnim = useRef(new Animated.Value(1)).current;

  // Check if product is in favorites when user is logged in
  useEffect(() => {
    const checkFavorite = async () => {
      if (user && product.id) {
        try {
          const response = await favoritesApi.check(product.id);
          setIsFavorite(response.data.is_favorite);
        } catch (error) {
          console.error('Error checking favorite:', error);
        }
      }
    };
    checkFavorite();
  }, [user, product.id]);

  const getName = () => {
    return language === 'ar' && product.name_ar ? product.name_ar : product.name;
  };

  // Get product brand name based on language
  const getBrandName = () => {
    if (language === 'ar' && product.product_brand_name_ar) {
      return product.product_brand_name_ar;
    }
    return product.product_brand_name || '';
  };

  // Get compatible car model name based on language
  const getCarModelName = () => {
    if (language === 'ar' && product.compatible_car_model_ar) {
      return product.compatible_car_model_ar;
    }
    return product.compatible_car_model || '';
  };

  // Get country of origin based on language
  const getCountry = () => {
    if (language === 'ar' && product.manufacturer_country_ar) {
      return product.manufacturer_country_ar;
    }
    return product.manufacturer_country || '';
  };

  // Calculate total price based on quantity
  const totalPrice = product.price * quantity;

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} ج.م`;
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setFavoriteLoading(true);
    try {
      const response = await favoritesApi.toggle(product.id);
      setIsFavorite(response.data.is_favorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!onAddToCart) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setCartLoading(true);
    setAddedToCart(true);
    
    try {
      await onAddToCart(quantity);
      // Reset added state after animation
      setTimeout(() => setAddedToCart(false), 1500);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setAddedToCart(false);
    } finally {
      setCartLoading(false);
    }
  };

  const handleIncreaseQuantity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantity(prev => prev + 1);
    
    // Animate quantity badge
    Animated.sequence([
      Animated.spring(quantityBounceAnim, {
        toValue: 1.3,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }),
      Animated.spring(quantityBounceAnim, {
        toValue: 1,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate price
    animatePrice();
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setQuantity(prev => prev - 1);
      
      // Animate quantity badge
      Animated.sequence([
        Animated.spring(quantityBounceAnim, {
          toValue: 0.7,
          friction: 5,
          tension: 300,
          useNativeDriver: true,
        }),
        Animated.spring(quantityBounceAnim, {
          toValue: 1,
          friction: 5,
          tension: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate price
      animatePrice();
    }
  };

  const animatePrice = () => {
    Animated.sequence([
      Animated.timing(priceScaleAnim, {
        toValue: 1.15,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(priceScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: cardWidth || 160, // Use cardWidth prop or default to 160
        },
      ]}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.7}
    >
      {/* Image Container */}
      <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
        )}
      </View>
      
      <View style={styles.content}>
        {/* Product Name */}
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {getName()}
        </Text>
        
        {/* Product Details Section */}
        {showDetails && (
          <View style={styles.detailsContainer}>
            {/* Brand Name */}
            {getBrandName() && (
              <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
                <Ionicons name="pricetag-outline" size={11} color={colors.primary} />
                <Text style={[styles.detailText, styles.brandText, { color: colors.primary }]} numberOfLines={1}>
                  {getBrandName()}
                </Text>
              </View>
            )}
            
            {/* SKU */}
            {product.sku && (
              <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
                <Ionicons name="barcode-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {product.sku}
                </Text>
              </View>
            )}
            
            {/* Country of Origin */}
            {getCountry() && (
              <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
                <Ionicons name="globe-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {getCountry()}
                </Text>
              </View>
            )}
            
            {/* Compatible Car Model */}
            {getCarModelName() && (
              <View style={[styles.detailRow, isRTL && styles.detailRowRTL]}>
                <Ionicons name="car-sport-outline" size={11} color={colors.success || '#10B981'} />
                <Text style={[styles.detailText, { color: colors.success || '#10B981' }]} numberOfLines={1}>
                  {getCarModelName()}
                  {product.compatible_car_models_count && product.compatible_car_models_count > 1 && (
                    ` +${product.compatible_car_models_count - 1}`
                  )}
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Quantity Selector Row */}
        <View style={[styles.quantityRow, isRTL && styles.quantityRowRTL]}>
          {/* Minus Button */}
          <TouchableOpacity
            onPress={handleDecreaseQuantity}
            style={[
              styles.quantityButton,
              { 
                backgroundColor: quantity > 1 ? colors.primary + '20' : colors.surface,
                borderColor: quantity > 1 ? colors.primary : colors.border,
              },
            ]}
            disabled={quantity <= 1}
          >
            <Ionicons 
              name="remove" 
              size={14} 
              color={quantity > 1 ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {/* Quantity Display */}
          <Animated.View
            style={[
              styles.quantityBadge,
              { 
                backgroundColor: colors.primary,
                transform: [{ scale: quantityBounceAnim }],
              },
            ]}
          >
            <Text style={styles.quantityText}>{quantity}</Text>
          </Animated.View>
          
          {/* Plus Button */}
          <TouchableOpacity
            onPress={handleIncreaseQuantity}
            style={[
              styles.quantityButton,
              { 
                backgroundColor: colors.primary + '20',
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="add" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Footer with Favorites button, Dynamic Price, and Add to Cart button */}
        <View style={[styles.footer, isRTL && styles.footerRTL]}>
          {/* Animated Favorites Button - Left */}
          <AnimatedFavoriteButton
            isFavorite={isFavorite}
            isLoading={favoriteLoading}
            onPress={handleToggleFavorite}
            size={16}
            style={styles.iconButton}
          />
          
          {/* Dynamic Price - Center */}
          <Animated.Text 
            style={[
              styles.price, 
              { 
                color: colors.primary,
                transform: [{ scale: priceScaleAnim }],
              }
            ]}
          >
            {formatPrice(totalPrice)}
          </Animated.Text>
          
          {/* Animated Add to Cart Button - Right */}
          {onAddToCart && (
            <AnimatedCartButton
              isInCart={addedToCart}
              isLoading={cartLoading}
              onPress={handleAddToCart}
              size={16}
              primaryColor={colors.primary}
              style={styles.iconButton}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    // width is now controlled by cardWidth prop, default 160
    margin: 6,
  },
  imageContainer: {
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // Brand badge overlay on image - removed
  brandBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    padding: 8,
    paddingTop: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    minHeight: 30,
    lineHeight: 15,
  },
  // Product details section
  detailsContainer: {
    marginBottom: 4,
    gap: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailRowRTL: {
    flexDirection: 'row-reverse',
  },
  detailText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 13,
  },
  brandText: {
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 6,
  },
  quantityRowRTL: {
    flexDirection: 'row-reverse',
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  quantityBadge: {
    minWidth: 26,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  quantityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
});
