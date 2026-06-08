export interface MasterProduct {
    id?: string;
    brand: string;
    product_name: string;
    harga_beli: number;
    volume_full: number;
    created_at?: string;
}

export interface ShareVariant {
    id?: string;
    product_id?: string;
    volume_share: number;
    biaya_packing: number;
    min_profit: number;
    admin_fee_percentage: number;
    admin_pk: number;
    whole_profit?: number;
    min_price_calculated?: number;
    final_price_calculated?: number;
}

// Untuk keperluan display history yang udah di-join
export interface ProductHistoryItem extends MasterProduct {
    variants: ShareVariant[];
}