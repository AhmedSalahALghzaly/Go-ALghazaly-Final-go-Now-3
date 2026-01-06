/**
 * Collection Screen - Product Inventory Management with Categories
 * View all products grouped by category with stock management
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../src/store/appStore';
import { productsApi, categoriesApi, productBrandsApi } from '../../src/services/api';

type ViewMode = 'grid' | 'list';
type GroupBy = 'category' | 'brand' | 'stock';

export default function CollectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useAppStore((state) => state.language);
  const products = useAppStore((state) => state.products);
  const setProducts = useAppStore((state) => state.setProducts);
  const isRTL = language === 'ar';

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        productsApi.getAllAdmin(),
        categoriesApi.getAll(),
        productBrandsApi.getAll(),
      ]);
      setProducts(productsRes.data?.products || []);
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
      
      // Expand first group by default
      const firstGroupId = categoriesRes.data?.[0]?.id;
      if (firstGroupId) {
        setExpandedGroups(new Set([firstGroupId]));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Filter and group products
  const groupedProducts = useMemo(() => {
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.name?.toLowerCase().includes(query) ||
        p.name_ar?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query)
      );
    }

    // Group by selected criteria
    const groups: Record<string, { name: string; nameAr: string; products: any[]; color: string }> = {};

    if (groupBy === 'category') {
      categories.forEach((cat: any) => {
        groups[cat.id] = {
          name: cat.name,
          nameAr: cat.name_ar,
          products: [],
          color: '#3B82F6',
        };
      });
      groups['uncategorized'] = { name: 'Uncategorized', nameAr: 'بدون فئة', products: [], color: '#6B7280' };

      filtered.forEach((product: any) => {
        const catId = product.category_id || 'uncategorized';
        if (groups[catId]) {
          groups[catId].products.push(product);
        } else {
          groups['uncategorized'].products.push(product);
        }
      });
    } else if (groupBy === 'brand') {
      brands.forEach((brand: any) => {
        groups[brand.id] = {
          name: brand.name,
          nameAr: brand.name_ar,
          products: [],
          color: '#10B981',
        };
      });
      groups['unbrand'] = { name: 'No Brand', nameAr: 'بدون ماركة', products: [], color: '#6B7280' };

      filtered.forEach((product: any) => {
        const brandId = product.product_brand_id || 'unbrand';
        if (groups[brandId]) {
          groups[brandId].products.push(product);
        } else {
          groups['unbrand'].products.push(product);
        }
      });
    } else if (groupBy === 'stock') {
      groups['out'] = { name: 'Out of Stock', nameAr: 'نفد المخزون', products: [], color: '#EF4444' };
      groups['low'] = { name: 'Low Stock (< 10)', nameAr: 'مخزون منخفض', products: [], color: '#F59E0B' };
      groups['good'] = { name: 'In Stock', nameAr: 'متوفر', products: [], color: '#10B981' };

      filtered.forEach((product: any) => {
        const stock = product.stock_quantity || product.stock || 0;
        if (stock === 0) {
          groups['out'].products.push(product);
        } else if (stock < 10) {
          groups['low'].products.push(product);
        } else {
          groups['good'].products.push(product);
        }
      });
    }

    // Filter out empty groups
    return Object.entries(groups)
      .filter(([_, group]) => group.products.length > 0)
      .map(([id, group]) => ({ id, ...group }));
  }, [products, categories, brands, searchQuery, groupBy]);

  const toggleGroup = (groupId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // Stats
  const stats = useMemo(() => ({
    total: products.length,
    outOfStock: products.filter((p: any) => (p.stock_quantity || p.stock || 0) === 0).length,
    lowStock: products.filter((p: any) => {
      const stock = p.stock_quantity || p.stock || 0;
      return stock > 0 && stock < 10;
    }).length,
    totalValue: products.reduce((sum: number, p: any) => sum + ((p.price || 0) * (p.stock_quantity || p.stock || 0)), 0),
  }), [products]);

  const renderProductItem = (product: any) => {
    const stock = product.stock_quantity || product.stock || 0;
    const stockColor = stock === 0 ? '#EF4444' : stock < 10 ? '#F59E0B' : '#10B981';

    if (viewMode === 'list') {
      return (
        <TouchableOpacity
          key={product.id}
          style={styles.listItem}
          onPress={() => router.push(`/product/${product.id}`)}
          activeOpacity={0.7}
        >
          <BlurView intensity={10} tint="light" style={styles.listItemBlur}>
            {product.images?.[0] || product.image_url ? (
              <Image source={{ uri: product.images?.[0] || product.image_url }} style={styles.listItemImage} />
            ) : (
              <View style={[styles.listItemImage, styles.placeholderImage]}>
                <Ionicons name="cube" size={20} color="rgba(255,255,255,0.5)" />
              </View>
            )}
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemName} numberOfLines={1}>
                {isRTL ? product.name_ar : product.name}
              </Text>
              <Text style={styles.listItemSku}>SKU: {product.sku}</Text>
            </View>
            <View style={styles.listItemMeta}>
              <Text style={styles.listItemPrice}>{product.price?.toLocaleString()} ج.م</Text>
              <View style={[styles.stockBadge, { backgroundColor: stockColor + '30' }]}>
                <Text style={[styles.stockBadgeText, { color: stockColor }]}>{stock}</Text>
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>
      );
    }

    // Grid view
    return (
      <TouchableOpacity
        key={product.id}
        style={styles.gridItem}
        onPress={() => router.push(`/product/${product.id}`)}
        activeOpacity={0.7}
      >
        <BlurView intensity={10} tint="light" style={styles.gridItemBlur}>
          {product.images?.[0] || product.image_url ? (
            <Image source={{ uri: product.images?.[0] || product.image_url }} style={styles.gridItemImage} />
          ) : (
            <View style={[styles.gridItemImage, styles.placeholderImage]}>
              <Ionicons name="cube" size={30} color="rgba(255,255,255,0.5)" />
            </View>
          )}
          <View style={[styles.gridStockBadge, { backgroundColor: stockColor }]}>
            <Text style={styles.gridStockText}>{stock}</Text>
          </View>
          <Text style={styles.gridItemName} numberOfLines={2}>
            {isRTL ? product.name_ar : product.name}
          </Text>
          <Text style={styles.gridItemPrice}>{product.price?.toLocaleString()} ج.م</Text>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#92400E', '#B45309', '#D97706']} style={StyleSheet.absoluteFill} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isRTL ? 'المجموعة' : 'Collection'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.viewToggle, viewMode === 'grid' && styles.viewToggleActive]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons name="grid" size={18} color={viewMode === 'grid' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons name="list" size={18} color={viewMode === 'list' ? '#FFF' : 'rgba(255,255,255,0.5)'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>{isRTL ? 'المنتجات' : 'Products'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.outOfStock}</Text>
            <Text style={styles.statLabel}>{isRTL ? 'نفد' : 'Out'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.lowStock}</Text>
            <Text style={styles.statLabel}>{isRTL ? 'منخفض' : 'Low'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{(stats.totalValue / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>{isRTL ? 'القيمة' : 'Value'}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={isRTL ? 'ابحث في المنتجات...' : 'Search products...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Group By Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupByContainer}>
          {[
            { id: 'category', label: 'Category', labelAr: 'الفئة' },
            { id: 'brand', label: 'Brand', labelAr: 'الماركة' },
            { id: 'stock', label: 'Stock Level', labelAr: 'المخزون' },
          ].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.groupByPill, groupBy === option.id && styles.groupByPillActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGroupBy(option.id as GroupBy);
              }}
            >
              <Text style={[styles.groupByText, groupBy === option.id && styles.groupByTextActive]}>
                {isRTL ? option.labelAr : option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grouped Products */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        ) : groupedProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="rgba(255,255,255,0.5)" />
            <Text style={styles.emptyText}>
              {searchQuery ? (isRTL ? 'لا توجد نتائج' : 'No results found') : (isRTL ? 'لا توجد منتجات' : 'No products yet')}
            </Text>
          </View>
        ) : (
          groupedProducts.map((group) => (
            <View key={group.id} style={styles.groupContainer}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(group.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.groupColorBar, { backgroundColor: group.color }]} />
                <Text style={styles.groupName}>
                  {isRTL ? group.nameAr : group.name}
                </Text>
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>{group.products.length}</Text>
                </View>
                <Ionicons
                  name={expandedGroups.has(group.id) ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="rgba(255,255,255,0.7)"
                />
              </TouchableOpacity>

              {expandedGroups.has(group.id) && (
                <View style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
                  {group.products.map(renderProductItem)}
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  headerRTL: { flexDirection: 'row-reverse' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '700', color: '#FFF' },
  headerActions: { flexDirection: 'row', gap: 4 },
  viewToggle: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  viewToggleActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#FFF' },
  groupByContainer: { marginTop: 16, marginBottom: 8 },
  groupByPill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  groupByPillActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  groupByText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  groupByTextActive: { color: '#FFF' },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, marginTop: 16 },
  groupContainer: { marginTop: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, gap: 10 },
  groupColorBar: { width: 4, height: 24, borderRadius: 2 },
  groupName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#FFF' },
  groupBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  groupBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, paddingHorizontal: 4 },
  listContainer: { marginTop: 12, gap: 8 },
  gridItem: { width: '47%', borderRadius: 12, overflow: 'hidden' },
  gridItemBlur: { padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  gridItemImage: { width: '100%', aspectRatio: 1, borderRadius: 8, marginBottom: 8 },
  gridStockBadge: { position: 'absolute', top: 14, right: 14, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gridStockText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  gridItemName: { fontSize: 13, fontWeight: '600', color: '#FFF', textAlign: 'center', marginBottom: 4 },
  gridItemPrice: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },
  listItem: { borderRadius: 12, overflow: 'hidden' },
  listItemBlur: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', gap: 12 },
  listItemImage: { width: 50, height: 50, borderRadius: 8 },
  placeholderImage: { backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  listItemSku: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  listItemMeta: { alignItems: 'flex-end' },
  listItemPrice: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  stockBadgeText: { fontSize: 12, fontWeight: '700' },
});
