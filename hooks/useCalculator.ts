import { useState, useMemo, useEffect } from 'react';

export interface CalculatorInputs {
    brand?: string;
    product_name?: string;
    harga_beli: number;
    volume_full: number;
    biaya_packing: number;
    biaya_proses: number;
    min_profit: number;
    whole_profit: number;
    admin_fee_percentage: number;
    service_fee_percentage: number;
}

export interface MatrixRow {
    vol: number;
    modalCairan: number;
    minPrice: number;
    optPrice: number;
    minusAdmin: number;
    plusAdmin: number;
}

export const useCalculator = () => {
    // Single unified inputs state reading values from localStorage safely during browser mount
    const [inputs, setInputs] = useState<CalculatorInputs>(() => {
        const isClient = typeof window !== 'undefined';
        const savedPacking = isClient ? window.localStorage.getItem('shareprice_biaya_packing') : null;
        const savedProses = isClient ? window.localStorage.getItem('shareprice_biaya_proses') : null;
        const savedMinProfit = isClient ? window.localStorage.getItem('shareprice_min_profit') : null;
        const savedWholeProfit = isClient ? window.localStorage.getItem('shareprice_whole_profit') : null;
        const savedAdminFee = isClient ? window.localStorage.getItem('shareprice_admin_fee') : null;
        const savedServiceFee = isClient ? window.localStorage.getItem('shareprice_service_fee') : null;

        return {
            brand: '',
            product_name: '',
            harga_beli: 0,
            volume_full: 0,
            biaya_packing: savedPacking !== null ? Number(savedPacking) : 2000,
            biaya_proses: savedProses !== null ? Number(savedProses) : 1250,
            min_profit: savedMinProfit !== null ? Number(savedMinProfit) : 0,
            whole_profit: savedWholeProfit !== null ? Number(savedWholeProfit) : 100,
            admin_fee_percentage: savedAdminFee !== null ? Number(savedAdminFee) : 8.25,
            service_fee_percentage: savedServiceFee !== null ? Number(savedServiceFee) : 5.5
        };
    });

    // Save secondary inputs to localStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('shareprice_biaya_packing', String(inputs.biaya_packing));
            window.localStorage.setItem('shareprice_biaya_proses', String(inputs.biaya_proses));
            window.localStorage.setItem('shareprice_min_profit', String(inputs.min_profit));
            window.localStorage.setItem('shareprice_whole_profit', String(inputs.whole_profit));
            window.localStorage.setItem('shareprice_admin_fee', String(inputs.admin_fee_percentage));
            window.localStorage.setItem('shareprice_service_fee', String(inputs.service_fee_percentage));
        }
    }, [
        inputs.biaya_packing,
        inputs.biaya_proses,
        inputs.min_profit,
        inputs.whole_profit,
        inputs.admin_fee_percentage,
        inputs.service_fee_percentage
    ]);

    // Predetermined volumes for the matrix calculations
    const targetVolumes = [0.5, 1, 2, 3, 4, 5, 10, 20, 30];

    // Dynamic row calculation using the exact formulas provided
    const matrixResults = useMemo<MatrixRow[]>(() => {
        const {
            harga_beli,
            volume_full,
            biaya_packing,
            biaya_proses,
            min_profit,
            whole_profit,
            admin_fee_percentage,
            service_fee_percentage
        } = inputs;

        return targetVolumes.map(vol => {
            const modalCairan = volume_full > 0 ? (harga_beli / volume_full) * vol : 0;
            
            // minPrice = ((harga_beli / volume_full) * vol) + biaya_packing + biaya_proses + min_profit
            const minPrice = modalCairan + biaya_packing + biaya_proses + min_profit;
            
            // optPrice = ((harga_beli / volume_full) * (whole_profit / 100) * vol) + biaya_packing + biaya_proses
            const optPrice = volume_full > 0 
                ? ((harga_beli / volume_full) * (whole_profit / 100) * vol) + biaya_packing + biaya_proses
                : 0;

            // minusAdmin = Math.max(minPrice, optPrice)
            const minusAdmin = Math.max(minPrice, optPrice);

            // plusAdmin = minusAdmin / (1 - ((admin_fee_percentage + service_fee_percentage) / 100))
            const totalFee = admin_fee_percentage + service_fee_percentage;
            const adminDivider = 1 - (totalFee / 100);
            const plusAdmin = adminDivider > 0 ? minusAdmin / adminDivider : minusAdmin;

            return {
                vol,
                modalCairan: Math.round(modalCairan),
                minPrice: Math.round(minPrice),
                optPrice: Math.round(optPrice),
                minusAdmin: Math.round(minusAdmin),
                plusAdmin: Math.round(plusAdmin)
            };
        });
    }, [inputs]);

    // Reset only primary form inputs
    const resetCalculator = () => {
        setInputs(prev => ({
            ...prev,
            brand: '',
            product_name: '',
            harga_beli: 0,
            volume_full: 0
        }));
    };

    return {
        inputs,
        setInputs,
        matrixResults,
        resetCalculator
    };
};