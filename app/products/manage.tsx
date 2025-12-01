import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Edit, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { ProductService, Product } from '@/src/features/products/services/product.service';
import { colors } from '@/src/theme/colors';
import { supabase } from '@/lib/supabase';
import { CurrencyConverter } from '@/src/utils/currency';

export default function ManageProductsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isSeller = profile?.role === 'seller';

  useEffect(() => {
    if (!isSeller || !user?.id) {
      Alert.alert('Lỗi', 'Chỉ seller mới có thể quản lý sản phẩm');
      router.back();
      return;
    }
    loadProducts();

    // Subscribe to realtime updates for products
    const productsChannel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'products',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          const newProduct = payload.new as Product;
          setProducts((prev) => [newProduct, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedProduct = payload.new as Product;
          setProducts((prev) =>
            prev.map((p) => (p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'products',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedProductId = payload.old.id as string;
          setProducts((prev) => prev.filter((p) => p.id !== deletedProductId));
        }
      )
      .subscribe();

    return () => {
      productsChannel.unsubscribe();
    };
  }, [user?.id, isSeller]);

  const loadProducts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const data = await ProductService.getBySeller(user.id, {
        includeUnavailable: true,
      });
      setProducts(data);
    } catch (error: any) {
      console.error('Error loading products:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (productId: string) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa sản phẩm này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user?.id) return;
              await ProductService.delete(productId, user.id);
              setProducts(prev => prev.filter(p => p.id !== productId));
              Alert.alert('Thành công', 'Đã xóa sản phẩm');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa sản phẩm');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price: number) => {
    return CurrencyConverter.format(price, 'VND');
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const hasDiscount = item.original_price && item.original_price > item.price;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push({
          pathname: '/products/[id]',
          params: { id: item.id },
        } as any)}
        activeOpacity={0.7}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <ShoppingBag size={32} color="#999" />
          </View>
        )}
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {!item.is_available && (
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableText}>Hết hàng</Text>
              </View>
            )}
          </View>
          {item.category && (
            <Text style={styles.productCategory}>{item.category.name}</Text>
          )}
          <View style={styles.priceContainer}>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {formatPrice(item.original_price!)}
              </Text>
            )}
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
          </View>
          <View style={styles.productMeta}>
            <Text style={styles.metaText}>Kho: {item.stock_quantity}</Text>
            <Text style={styles.metaText}>Đã bán: {item.sales_count}</Text>
          </View>
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/products/edit/[id]',
              params: { id: item.id },
            } as any)}
          >
            <Edit size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý sản phẩm</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/products/create')}
          >
            <Plus size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={64} color="#ccc" />
          <Text style={styles.emptyText}>Chưa có sản phẩm</Text>
          <Text style={styles.emptySubtext}>
            Tạo sản phẩm đầu tiên của bạn để bắt đầu bán hàng
          </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/products/create')}
            >
            <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.emptyButtonText}>Tạo sản phẩm</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadProducts();
              }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  unavailableBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
  },
  productCategory: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  productMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  productActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

