'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCalculator } from '../hooks/useCalculator';
import { useProducts } from '../hooks/useProducts';
import { MasterProduct, ShareVariant } from '../types';

export default function Home() {
    const {
        inputs,
        setInputs,
        matrixResults,
        resetCalculator
    } = useCalculator();

    const {
        history,
        loading: historyLoading,
        saveProductMatrix,
        deleteProduct
    } = useProducts();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'tabel' | 'ringkasan'>('ringkasan');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
        type: null,
        message: ''
    });

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // State for History Sorting
    const [sortBy, setSortBy] = useState<'date' | 'brand'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const handleSortChange = (type: 'date' | 'brand') => {
        if (sortBy === type) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(type);
            setSortDirection(type === 'date' ? 'desc' : 'asc');
        }
    };

    const sortedHistory = useMemo(() => {
        if (!history) return [];
        return [...history].sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
            } else {
                const brandA = (a.brand || '').toLowerCase().trim();
                const brandB = (b.brand || '').toLowerCase().trim();
                if (brandA < brandB) return sortDirection === 'asc' ? -1 : 1;
                if (brandA > brandB) return sortDirection === 'asc' ? 1 : -1;

                const nameA = (a.product_name || '').toLowerCase().trim();
                const nameB = (b.product_name || '').toLowerCase().trim();
                if (nameA < nameB) return sortDirection === 'asc' ? -1 : 1;
                if (nameA > nameB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            }
        });
    }, [history, sortBy, sortDirection]);

    // Handle input field changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setInputs(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
        }));
    };

    // Auto multiplier shortcut for Harga Beli on Blur
    const handleHargaBeliBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        if (val > 0 && val <= 999) {
            setInputs(prev => ({
                ...prev,
                harga_beli: val * 1000
            }));
        }
    };

    // Save calculation matrix with default fallback names for blank inputs
    const handleSaveMatrix = async () => {
        setSaving(true);
        setSaveStatus({ type: null, message: '' });

        // Fallbacks if brand or product name are empty
        const brandName = inputs.brand?.trim() || 'Tanpa Brand';
        const productName = inputs.product_name?.trim() || `Produk Eceran #${new Date().toLocaleDateString('id-ID')}`;

        const product: MasterProduct = {
            brand: brandName,
            product_name: productName,
            harga_beli: inputs.harga_beli,
            volume_full: inputs.volume_full
        };

        const variants: ShareVariant[] = matrixResults.map(row => ({
            volume_share: row.vol,
            biaya_packing: inputs.biaya_packing,
            min_profit: inputs.min_profit,
            admin_fee_percentage: inputs.admin_fee_percentage,
            admin_pk: 0,
            whole_profit: inputs.whole_profit,
            min_price_calculated: row.minusAdmin,
            final_price_calculated: row.plusAdmin
        }));

        try {
            const res = await saveProductMatrix(product, variants);
            if (res && res.success) {
                setSaveStatus({
                    type: 'success',
                    message: 'Histori kalkulasi matriks berhasil disimpan! 💚'
                });
                setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
            } else {
                setSaveStatus({
                    type: 'error',
                    message: 'Gagal menyimpan kalkulasi. Periksa koneksi Supabase Anda.'
                });
            }
        } catch (err: any) {
            setSaveStatus({
                type: 'error',
                message: err.message || 'Gagal menyimpan kalkulasi.'
            });
        } finally {
            setSaving(false);
        }
    };

    // Load past calc item from history
    const handleLoadFromHistory = (item: any) => {
        const primaryVar = item.variants && item.variants.length > 0 ? item.variants[0] : null;

        let wholeProfitLoaded = 100;
        if (item.variants && item.variants.length > 0) {
            // Iterate backwards from the largest volume to extract/derive the correct whole_profit
            for (let i = item.variants.length - 1; i >= 0; i--) {
                const v = item.variants[i];
                if (v.whole_profit !== undefined && v.whole_profit !== null) {
                    wholeProfitLoaded = v.whole_profit;
                    break;
                }
                
                const modalCairan = item.volume_full > 0 ? (item.harga_beli / item.volume_full) * v.volume_share : 0;
                const minPrice = modalCairan + v.biaya_packing + v.min_profit;
                const minPriceCalculated = v.min_price_calculated || 0;
                
                if (minPriceCalculated > minPrice && modalCairan > 0) {
                    wholeProfitLoaded = Math.round(100 * (minPriceCalculated - v.biaya_packing) / modalCairan);
                    break;
                }
            }
        }

        const newInputs = {
            brand: item.brand,
            product_name: item.product_name,
            harga_beli: item.harga_beli,
            volume_full: item.volume_full,
            biaya_packing: primaryVar ? primaryVar.biaya_packing : 0,
            min_profit: primaryVar ? primaryVar.min_profit : 0,
            whole_profit: wholeProfitLoaded,
            admin_fee_percentage: primaryVar ? primaryVar.admin_fee_percentage : 0
        };

        setInputs(newInputs);

        // Sync to localStorage
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('shareprice_biaya_packing', String(newInputs.biaya_packing));
            window.localStorage.setItem('shareprice_min_profit', String(newInputs.min_profit));
            window.localStorage.setItem('shareprice_whole_profit', String(newInputs.whole_profit));
            window.localStorage.setItem('shareprice_admin_fee', String(newInputs.admin_fee_percentage));
        }

        setSaveStatus({
            type: 'success',
            message: `Memuat histori: ${item.brand} - ${item.product_name}`
        });
        setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    };

    const handleDeleteHistory = async (id?: string) => {
        if (!id) return;
        setSaveStatus({ type: null, message: '' });
        try {
            const res = await deleteProduct(id);
            if (res && res.success) {
                setSaveStatus({
                    type: 'success',
                    message: 'Histori kalkulasi berhasil dihapus! 🗑️'
                });
                setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
            } else {
                setSaveStatus({
                    type: 'error',
                    message: 'Gagal menghapus histori.'
                });
            }
        } catch (err: any) {
            setSaveStatus({
                type: 'error',
                message: err.message || 'Gagal menghapus histori.'
            });
        }
    };

    return (
        <main className="max-w-xl mx-auto bg-[#f4f7f5] min-h-screen text-gray-800 antialiased relative">
            {/* Header section (Elegant Bottle Green Header styled like Daily UI but full width top block) */}
            <header className="bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] text-white pt-10 pb-16 text-center relative overflow-hidden">
                {/* Centered Title */}
                <h1 className="text-3xl sm:text-4xl font-black tracking-wide text-white">
                    Price2Share
                </h1>

                {/* Premium Background Silhouette Graphic */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none scale-150 transform rotate-12">
                    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm-1 9H8V8h8v4z"/>
                    </svg>
                </div>
            </header>

            {/* Main content body (slides up over header with rounded-t-[32px]) */}
            <div className="bg-[#f4f7f5] rounded-t-[32px] px-4 sm:px-6 pt-6 pb-6 -mt-8 relative z-20 space-y-6">

            {!isMounted ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center font-bold text-gray-400">
                    Memuat Kalkulator...
                </div>
            ) : (
                <>
                    {/* Notification alert banners */}
            {saveStatus.type && (
                <div className={`p-4 rounded-xl shadow-sm text-sm border font-semibold flex items-center justify-between ${
                    saveStatus.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                    <p>{saveStatus.message}</p>
                    <button onClick={() => setSaveStatus({ type: null, message: '' })} className="font-bold hover:opacity-75">
                        ✕
                    </button>
                </div>
            )}

            {/* Primary Inputs Section */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-5">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                        INPUT UTAMA
                    </h2>
                    <button
                        onClick={resetCalculator}
                        className="text-xs text-red-600 hover:text-red-700 font-bold transition-colors"
                    >
                        Reset Kalkulator
                    </button>
                </div>

                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-7 flex flex-col space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase">Harga Beli (Rp) *</label>
                        <div className="bg-[#1b4332] border border-transparent rounded-xl p-2 flex items-center gap-3 focus-within:bg-[#23533e] focus-within:ring-2 focus-within:ring-emerald-400 transition-all">
                            {/* Icon Badge */}
                            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                                    <span className="text-[9.5px] font-black text-[#1b4332] leading-none">Rp</span>
                                </div>
                            </div>
                            <input
                                type="number"
                                name="harga_beli"
                                value={inputs.harga_beli || ''}
                                onChange={handleInputChange}
                                onBlur={handleHargaBeliBlur}
                                placeholder="200000"
                                className="bg-transparent border-none outline-none w-full text-2xl font-black text-white placeholder-emerald-100/40 p-0 focus:ring-0 focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                    <div className="col-span-5 flex flex-col space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase">Volume (ml/gr) *</label>
                        <div className="bg-[#1b4332] border border-transparent rounded-xl p-2 flex items-center gap-2 focus-within:bg-[#23533e] focus-within:ring-2 focus-within:ring-emerald-400 transition-all">
                            {/* Icon Badge */}
                            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                                    <svg className="w-3 h-3 text-[#1b4332]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 19.5L13.5 9V4h1.5V2H9v2h1.5v5L5 19.5c-.6 1-.1 2.5 1.1 2.5h11.8c1.2 0 1.7-1.5 1.1-2.5zM7.7 19l3.8-7.2V4h1v7.8l3.8 7.2H7.7z" />
                                    </svg>
                                </div>
                            </div>
                            <input
                                type="number"
                                name="volume_full"
                                value={inputs.volume_full || ''}
                                onChange={handleInputChange}
                                placeholder="100"
                                className="bg-transparent border-none outline-none w-full text-2xl font-black text-center text-white placeholder-emerald-100/40 p-0 focus:ring-0 focus:outline-none"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Brand & Product Name (Moved outside settings) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase">Brand</label>
                        <div className="bg-white border border-gray-200 rounded-xl p-2 flex items-center gap-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#1b4332] transition-all">
                            {/* Icon Badge */}
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <div className="w-7 h-7 rounded-full bg-[#1b4332] flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.41 2.58A2 2 0 0011 2H4a2 2 0 00-2 2v7c0 .55.22 1.05.59 1.41l9 9a2 2 0 002.83 0l7-7a2 2 0 000-2.83l-9-9zM6 8a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                </div>
                            </div>
                            <input
                                type="text"
                                name="brand"
                                value={inputs.brand || ''}
                                onChange={handleInputChange}
                                placeholder="E.g., Maybelline"
                                className="bg-transparent border-none outline-none w-full text-base font-semibold text-gray-900 placeholder-gray-400 p-0 focus:ring-0 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase">Nama Produk</label>
                        <div className="bg-white border border-gray-200 rounded-xl p-2 flex items-center gap-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-[#1b4332] transition-all">
                            {/* Icon Badge */}
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                                <div className="w-7 h-7 rounded-full bg-[#1b4332] flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7.5L12 3 4 7.5M20 7.5v9L12 21M20 7.5L12 12M4 7.5v9L12 21M4 7.5L12 12M12 12v9" />
                                    </svg>
                                </div>
                            </div>
                            <input
                                type="text"
                                name="product_name"
                                value={inputs.product_name || ''}
                                onChange={handleInputChange}
                                placeholder="E.g., FitMe"
                                className="bg-transparent border-none outline-none w-full text-base font-semibold text-gray-900 placeholder-gray-400 p-0 focus:ring-0 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Collapsible Settings Section */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="w-full px-4 py-3.5 flex justify-between items-center bg-gray-50 border-b border-gray-150 focus:outline-none"
                    >
                        <span className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-2">
                            ⚙️ Pengaturan Biaya & Admin
                        </span>
                        <svg
                            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isSettingsOpen ? 'transform rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {isSettingsOpen && (
                        <div className="p-4 space-y-4 bg-white border-t border-gray-100">

                            {/* Packing & Min Profit */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Biaya Packing (Rp)</label>
                                    <input
                                        type="number"
                                        name="biaya_packing"
                                        value={inputs.biaya_packing || ''}
                                        onChange={handleInputChange}
                                        placeholder="3000"
                                        className="border border-gray-200 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Min Profit (Rp)</label>
                                    <input
                                        type="number"
                                        name="min_profit"
                                        value={inputs.min_profit || ''}
                                        onChange={handleInputChange}
                                        placeholder="5000"
                                        className="border border-gray-200 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                                    />
                                </div>
                            </div>

                            {/* Whole Profit & Admin Fee */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Whole Profit (%)</label>
                                    <input
                                        type="number"
                                        name="whole_profit"
                                        value={inputs.whole_profit || ''}
                                        onChange={handleInputChange}
                                        placeholder="100"
                                        className="border border-gray-200 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1">Admin Fee (%)</label>
                                    <input
                                        type="number"
                                        name="admin_fee_percentage"
                                        value={inputs.admin_fee_percentage || ''}
                                        onChange={handleInputChange}
                                        placeholder="6"
                                        className="border border-gray-200 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Tabs & Results Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-250 pb-2">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                        MATRIKS HARGA JUAL
                    </h3>
                    
                    {/* Tab Navigation */}
                    <div className="flex bg-gray-200 rounded-lg p-0.5 text-xs font-bold border border-gray-300">
                        <button
                            onClick={() => setActiveTab('ringkasan')}
                            className={`px-3 py-1.5 rounded-md transition-all ${
                                activeTab === 'ringkasan'
                                    ? 'bg-[#1b4332] text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Ringkasan
                        </button>
                        <button
                            onClick={() => setActiveTab('tabel')}
                            className={`px-3 py-1.5 rounded-md transition-all ${
                                activeTab === 'tabel'
                                    ? 'bg-[#1b4332] text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Tabel
                        </button>
                    </div>
                </div>

                {/* Brand & Product Name Badge (Positioned below the header & tab switcher line) */}
                <div className="pt-1.5 pb-1">
                    { (inputs.brand?.trim() || inputs.product_name?.trim()) ? (
                        <div className="inline-flex items-center flex-wrap gap-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-semibold tracking-wide text-emerald-800 self-start">
                            <span className="font-extrabold uppercase">{inputs.brand?.trim() || 'Tanpa Brand'}</span>
                            <span className="text-emerald-300 font-light">|</span>
                            <span className="text-emerald-900 font-medium">{inputs.product_name?.trim() || 'Produk Baru'}</span>
                            {inputs.harga_beli > 0 && (
                                <>
                                    <span className="text-emerald-300 font-light">|</span>
                                    <span className="text-emerald-900 font-semibold font-mono">
                                        {inputs.harga_beli >= 1000 
                                            ? `${Number((inputs.harga_beli / 1000).toFixed(1).replace(/\.0$/, ''))}K`
                                            : inputs.harga_beli}
                                    </span>
                                </>
                            )}
                            {inputs.volume_full > 0 && (
                                <>
                                    <span className="text-emerald-300 font-light">|</span>
                                    <span className="text-emerald-900 font-semibold font-mono">{inputs.volume_full}ml</span>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium tracking-wide text-gray-500 self-start">
                            <span>Tanpa Brand / Produk</span>
                        </div>
                    )}
                </div>

                {activeTab === 'ringkasan' ? (
                    /* Dynamic Grid Results (Ringkasan Tab) */
                    <div className="grid grid-cols-2 gap-3">
                        {matrixResults.map((row) => (
                            <div
                                key={row.vol}
                                className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between gap-2"
                            >
                                <span className="text-[11px] font-black bg-[#e8f0ea] text-[#1b4332] px-2.5 py-0.5 rounded-md shrink-0">
                                    {row.vol}
                                </span>
                                
                                <span className="font-mono font-black text-emerald-950 text-base sm:text-lg text-right truncate">
                                    Rp {row.plusAdmin.toLocaleString('id-ID')}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Detailed Tabular View (Tabel Tab) */
                    <div className="overflow-x-auto rounded-xl border border-gray-250 shadow-sm bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-gray-250 bg-[#e8f0ea] text-[#1b4332] font-extrabold">
                                    <th className="p-2.5 font-extrabold border-r border-gray-200 text-center">QTY (ml)</th>
                                    <th className="p-2.5 font-extrabold border-r border-gray-200 bg-cyan-50 text-cyan-950">MIN PRICE</th>
                                    <th className="p-2.5 font-extrabold border-r border-gray-200 bg-cyan-50 text-cyan-950">OPT PRICE</th>
                                    <th className="p-2.5 font-extrabold border-r border-gray-200 bg-[#a2e8f0]/30 text-cyan-950">- ADMIN</th>
                                    <th className="p-2.5 font-extrabold bg-[#bbf7d0]/30 text-emerald-950">+ ADMIN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrixResults.map((row, idx) => (
                                    <tr
                                        key={row.vol}
                                        className={`border-b border-gray-150 last:border-b-0 hover:bg-[#e8f0ea]/20 transition-all ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                    >
                                        <td className="p-2.5 font-mono font-bold text-center border-r border-gray-200 bg-gray-100">
                                            {row.vol}
                                        </td>
                                        <td className="p-2.5 font-mono font-semibold text-gray-700 border-r border-gray-200 bg-cyan-50/20">
                                            {row.minPrice.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-2.5 font-mono font-semibold text-gray-700 border-r border-gray-200 bg-cyan-50/20">
                                            {row.optPrice.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-2.5 font-mono font-bold text-gray-700 border-r border-gray-200 bg-[#a2e8f0]/10">
                                            {row.minusAdmin.toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-2.5 font-mono font-black text-emerald-700 bg-[#bbf7d0]/15">
                                            {row.plusAdmin.toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Save Action Button */}
            <section className="pt-2">
                <button
                    onClick={handleSaveMatrix}
                    disabled={saving}
                    className={`w-full bg-[#1b4332] text-white hover:bg-[#2d6a4f] rounded-xl p-3.5 text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 ${
                        saving ? 'opacity-65 cursor-not-allowed' : ''
                    }`}
                >
                    {saving ? (
                        <span>MENYIMPAN KE HISTORI...</span>
                    ) : (
                        <>
                            <span>💾 Simpan ke Histori</span>
                        </>
                    )}
                </button>
            </section>
                </>
            )}

            {/* Calculation History list (Clean & Low-Profile) */}
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                <div className="border-b border-gray-100 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                        📜 Histori Perhitungan
                    </h2>
                    
                    {/* Sort Selector */}
                    <div className="flex bg-gray-100 rounded-lg p-0.5 text-[10px] font-bold border border-gray-250 self-end sm:self-auto shadow-inner">
                        <button
                            onClick={() => handleSortChange('date')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                                sortBy === 'date'
                                    ? 'bg-[#1b4332] text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>Tanggal</span>
                            {sortBy === 'date' && (sortDirection === 'desc' ? '▼' : '▲')}
                        </button>
                        <button
                            onClick={() => handleSortChange('brand')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                                sortBy === 'brand'
                                    ? 'bg-[#1b4332] text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <span>Brand</span>
                            {sortBy === 'brand' && (sortDirection === 'asc' ? '▲' : '▼')}
                        </button>
                    </div>
                </div>

                {historyLoading ? (
                    <div className="text-center font-semibold text-xs py-6 uppercase text-gray-400 animate-pulse">
                        LOADING HISTORI DARI DATABASE...
                    </div>
                ) : sortedHistory.length === 0 ? (
                    <div className="text-center font-semibold text-xs py-6 uppercase text-gray-400 border border-dashed border-gray-200 rounded-xl p-3">
                        TIDAK ADA DATA HISTORI
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {sortedHistory.map((item, index) => {
                            return (
                                <div
                                    key={item.id || index}
                                    onClick={() => handleLoadFromHistory(item)}
                                    className="bg-gray-50 rounded-xl p-3 border border-gray-150 hover:bg-[#e8f0ea]/30 hover:border-emerald-200 cursor-pointer shadow-sm transition-all flex items-center justify-between gap-3 group"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="bg-[#1b4332] text-white text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-md shrink-0">
                                                    {item.brand}
                                                </span>
                                                <h4 className="text-xs font-bold text-gray-800 uppercase leading-tight truncate">
                                                    {item.product_name}
                                                </h4>
                                            </div>
                                            <span className="text-[9px] font-mono text-gray-400 font-semibold shrink-0 ml-2">
                                                {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : 'BARU'}
                                            </span>
                                        </div>

                                        <div className="flex gap-4 text-[10px] text-gray-500 font-semibold bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                                            <span>Full: {item.volume_full}ml</span>
                                            <span>Modal: Rp {item.harga_beli.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>

                                    {/* Low-profile delete button using sage/bottle green theme with muted red on hover */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteHistory(item.id);
                                        }}
                                        className="shrink-0 p-2 rounded-lg bg-gray-100 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 hover:border-rose-100 transition-colors focus:outline-none"
                                        title="Hapus Histori"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
            </div>
        </main>
    );
}
