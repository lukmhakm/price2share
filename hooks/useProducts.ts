import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Pastikan lo udah setup supabase client-nya ya
import { MasterProduct, ShareVariant, ProductHistoryItem } from '../types';

export const useProducts = () => {
    const [history, setHistory] = useState<ProductHistoryItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // 1. FUNGSI UNTUK TARIK HISTORI PRODUK DAN VARIANNYA
    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Kita tarik data master_products sekalian di-join dengan share_variants-nya
            const { data, error } = await supabase
                .from('master_products')
                .select(`
          *,
          variants:share_variants(*)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Gagal mengambil histori:', error);
        } finally {
            setLoading(false);
        }
    };

    // 2. FUNGSI UNTUK SAVE HITUNGAN BARU KE DATABASE (BIAR MASUK HISTORI)
    const saveCalculation = async (product: MasterProduct, variant: ShareVariant) => {
        setLoading(true);
        try {
            let productId = product.id;

            // Jika ini produk master baru (belum ada di histori), kita insert dulu ke master_products
            if (!productId) {
                const { data: newProduct, error: prodError } = await supabase
                    .from('master_products')
                    .insert([
                        {
                            brand: product.brand,
                            product_name: product.product_name,
                            harga_beli: product.harga_beli,
                            volume_full: product.volume_full,
                        },
                    ])
                    .select()
                    .single();

                if (prodError) throw prodError;
                productId = newProduct.id;
            }

            // Hitung ulang nilai akhir secara eksplisit untuk disimpan ke kolom kalkulasi di database
            const hargaModalPerJar = (product.harga_beli / product.volume_full) * variant.volume_share;
            const minPrice = hargaModalPerJar + variant.biaya_packing + variant.min_profit;
            
            const wholeProfitPercentage = variant.whole_profit !== undefined ? variant.whole_profit : 100;
            const optPrice = product.volume_full > 0
                ? (product.harga_beli / product.volume_full) * (wholeProfitPercentage / 100) * variant.volume_share + variant.biaya_packing
                : 0;

            const minusAdmin = Math.max(minPrice, optPrice);
            const percentageCost = variant.admin_fee_percentage / 100;
            const divider = 1 - percentageCost;
            const plusAdmin = divider > 0 ? minusAdmin / divider : minusAdmin;

            const payload = {
                product_id: productId,
                volume_share: variant.volume_share,
                biaya_packing: variant.biaya_packing,
                min_profit: variant.min_profit,
                admin_fee_percentage: variant.admin_fee_percentage,
                admin_pk: variant.admin_pk || 0,
                min_price_calculated: Math.round(minusAdmin),
                final_price_calculated: Math.round(plusAdmin)
            };

            // Log payload sebelum insert ke Supabase untuk verifikasi persentase optimal
            console.log('Menyimpan kalkulasi ke Supabase dengan payload:', JSON.stringify({
                ...payload,
                whole_profit_percentage_used: wholeProfitPercentage
            }, null, 2));

            // Setelah dapet productId-nya, kita insert data varian share-nya ke share_variants
            const { error: varError } = await supabase
                .from('share_variants')
                .insert([payload]);

            if (varError) throw varError;

            // Refresh data histori biar langsung update di layar
            await fetchHistory();
            return { success: true };
        } catch (error) {
            console.error('Gagal menyimpan kalkulasi:', JSON.stringify(error, null, 2), error);
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    // 3. FUNGSI UNTUK SAVE MATRIKS PRODUK LENGKAP KE DATABASE (BULK INSERT)
    const saveProductMatrix = async (product: MasterProduct, variants: ShareVariant[]) => {
        setLoading(true);
        try {
            let productId = product.id;

            // Jika ini produk master baru (belum ada di histori), kita insert dulu ke master_products
            if (!productId) {
                const { data: newProduct, error: prodError } = await supabase
                    .from('master_products')
                    .insert([
                        {
                            brand: product.brand,
                            product_name: product.product_name,
                            harga_beli: product.harga_beli,
                            volume_full: product.volume_full,
                        },
                    ])
                    .select()
                    .single();

                if (prodError) throw prodError;
                productId = newProduct.id;
            }

            // Setelah dapet productId-nya, kita insert list varian ke share_variants
            const variantsData = variants.map(v => ({
                product_id: productId,
                volume_share: v.volume_share,
                biaya_packing: v.biaya_packing,
                min_profit: v.min_profit,
                admin_fee_percentage: v.admin_fee_percentage,
                admin_pk: v.admin_pk || 0,
                min_price_calculated: Math.round(v.min_price_calculated || 0),
                final_price_calculated: Math.round(v.final_price_calculated || 0),
            }));

            // Log payload sebelum insert ke Supabase untuk verifikasi persentase optimal
            console.log('Menyimpan matriks kalkulasi ke Supabase dengan payload:', JSON.stringify(variantsData, null, 2));

            const { error: varError } = await supabase
                .from('share_variants')
                .insert(variantsData);

            if (varError) throw varError;

            // Refresh data histori biar langsung update di layar
            await fetchHistory();
            return { success: true };
        } catch (error) {
            console.error('Gagal menyimpan matriks kalkulasi:', error);
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    // 4. FUNGSI UNTUK DELETE PRODUK DAN VARIANT-NYA (CASCADE DELETE)
    const deleteProduct = async (id: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('master_products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await fetchHistory();
            return { success: true };
        } catch (error) {
            console.error('Gagal menghapus produk:', error);
            return { success: false, error };
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch histori pas pertama kali app dibuka
    useEffect(() => {
        fetchHistory();
    }, []);

    return {
        history,
        loading,
        refreshHistory: fetchHistory,
        saveCalculation,
        saveProductMatrix,
        deleteProduct,
    };
};