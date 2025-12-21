import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

interface SearchableSelectProps {
    value: string;
    options: { id: string | number; name: string }[];
    onChange: (value: string) => void;
    placeholder: string;
    label?: string;
    disabled?: boolean;
    isLoading?: boolean;
    error?: string;
    onRetry?: () => void;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    options = [],
    onChange,
    placeholder,
    label,
    disabled = false,
    isLoading = false,
    error,
    onRetry,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedOption = useMemo(() =>
        options.find(opt => opt && opt.id && opt.id.toString() === value.toString()),
        [options, value]
    );

    const filteredOptions = useMemo(() =>
        options.filter(opt =>
            opt && opt.name && opt.name.toLowerCase().includes(search.toLowerCase())
        ),
        [options, search]
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    if (isLoading) {
        return (
            <div className={cn("relative", className)}>
                {label && <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">{label}</label>}
                <div className="w-full border p-3 rounded-lg bg-gray-50 flex items-center justify-between opacity-70">
                    <span className="text-gray-400 italic text-sm animate-pulse flex items-center gap-2">
                        <span className="material-icons text-sm animate-spin">sync</span>
                        Loading {placeholder.toLowerCase()}...
                    </span>
                    <span className="material-icons text-gray-300">expand_more</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("relative", className)}>
                {label && <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">{label}</label>}
                <div className="w-full border border-red-100 p-3 rounded-xl bg-red-50/30 flex items-center justify-between">
                    <span className="text-red-400 text-xs font-medium flex items-center gap-2">
                        <span className="material-icons text-sm">error_outline</span>
                        {error}
                    </span>
                    {onRetry && (
                        <button
                            onClick={(e) => { e.preventDefault(); onRetry(); }}
                            className="bg-white border border-red-100 text-red-500 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("relative", className)}>
            {label && <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">{label}</label>}

            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(true)}
                className={cn(
                    "w-full border p-3 rounded-lg bg-gray-50 flex items-center justify-between transition-all",
                    disabled ? "opacity-50 cursor-not-allowed" : "hover:border-orange-200 active:bg-gray-100",
                )}
            >
                <span className={cn("truncate", !selectedOption && "text-gray-400")}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <span className="material-icons text-gray-400">expand_more</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="px-4 py-3 border-b flex items-center gap-3 bg-white sticky top-0 safe-area-top">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 -ml-2 text-gray-500"
                        >
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div className="flex-1 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-gray-400 text-sm">search</span>
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={`Search ${placeholder.toLowerCase()}...`}
                                className="w-full bg-gray-100 border-none rounded-full py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-orange-500"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    <span className="material-icons text-sm">cancel</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2">
                            {filteredOptions.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <span className="material-icons text-4xl block mb-2">search_off</span>
                                    No results found for "{search}"
                                </div>
                            ) : (
                                filteredOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelect(opt.id.toString())}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl flex items-center justify-between transition-colors",
                                            value.toString() === opt.id.toString()
                                                ? "bg-orange-50 text-orange-600 font-bold"
                                                : "active:bg-gray-50"
                                        )}
                                    >
                                        <span className="text-sm">{opt.name}</span>
                                        {value.toString() === opt.id.toString() && (
                                            <span className="material-icons text-sm">check</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
