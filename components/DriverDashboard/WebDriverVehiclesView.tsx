import React, { useEffect, useState } from 'react';
import { fetchDriverVehicles, createDriverVehicle, updateDriverVehicle, deleteDriverVehicle } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface WebDriverVehiclesViewProps {
    partnerId: string;
}

interface Vehicle {
    id: string;
    vehicle_type: 'motorcycle' | 'car' | 'van' | 'truck' | 'bicycle';
    license_plate: string;
    make: string;
    model: string;
    year: number;
    color: string;
    max_package_size: 'small' | 'medium' | 'large' | 'extra_large';
    is_active: boolean;
}

export const WebDriverVehiclesView: React.FC<WebDriverVehiclesViewProps> = ({ partnerId }) => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [realPartnerId, setRealPartnerId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        vehicle_type: 'motorcycle',
        max_package_size: 'small'
    });

    const loadVehicles = async () => {
        setLoading(true);
        // First resolve the real partner ID using the user ID passed as prop
        const { data: profile } = await supabase
            .from('delivery_partners')
            .select('id')
            .eq('user_id', partnerId)
            .single();

        if (profile) {
            setRealPartnerId(profile.id);
            const data = await fetchDriverVehicles(profile.id);
            setVehicles(data);
        } else {
            console.error('Driver profile not found for user:', partnerId);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadVehicles();
    }, [partnerId]);

    const handleSave = async () => {
        if (!realPartnerId) return; // Should not happen if loaded

        if (!formData.license_plate) {
            alert('License plate is required');
            return;
        }

        try {
            if (editingVehicle) {
                const { error } = await updateDriverVehicle(editingVehicle.id, formData as any);
                if (error) throw error;
            } else {
                const { error } = await createDriverVehicle({
                    partner_id: realPartnerId,
                    ...formData as any
                });
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingVehicle(null);
            setFormData({ vehicle_type: 'motorcycle', max_package_size: 'small' });
            loadVehicles();
        } catch (error: any) {
            alert('Error saving vehicle: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to remove this vehicle?')) {
            await deleteDriverVehicle(id);
            loadVehicles();
        }
    };

    const openEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setFormData(vehicle);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingVehicle(null);
        setFormData({ vehicle_type: 'motorcycle', max_package_size: 'small' });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fleet Management</h1>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Manage your delivery vehicles</p>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-slate-200"
                >
                    <span className="material-icons">add</span>
                    <span className="font-bold text-sm uppercase tracking-wider">Add Vehicle</span>
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[200px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            ) : vehicles.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-icons text-slate-300 text-4xl">no_crash</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900">No Vehicles Added</h3>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">Add a vehicle to start accepting delivery assignments.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => openEdit(vehicle)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600">
                                    <span className="material-icons text-sm">edit</span>
                                </button>
                                <button onClick={() => handleDelete(vehicle.id)} className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-500">
                                    <span className="material-icons text-sm">delete</span>
                                </button>
                            </div>

                            <div className="flex items-start gap-4 mb-6">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl
                                    ${vehicle.vehicle_type === 'motorcycle' ? 'bg-orange-50 text-orange-600' :
                                        vehicle.vehicle_type === 'car' ? 'bg-blue-50 text-blue-600' :
                                            vehicle.vehicle_type === 'van' ? 'bg-purple-50 text-purple-600' :
                                                'bg-emerald-50 text-emerald-600'}`}>
                                    <span className="material-icons">
                                        {vehicle.vehicle_type === 'motorcycle' ? 'two_wheeler' :
                                            vehicle.vehicle_type === 'bicycle' ? 'pedal_bike' :
                                                vehicle.vehicle_type === 'truck' ? 'local_shipping' : 'directions_car'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-900 capitalize">{vehicle.make} {vehicle.model}</h3>
                                    <div className="bg-slate-100 px-2 py-1 rounded-md inline-block mt-1">
                                        <p className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">{vehicle.license_plate}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Type</span>
                                    <span className="font-bold text-slate-700 capitalize">{vehicle.vehicle_type}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Color</span>
                                    <span className="font-bold text-slate-700 capitalize">{vehicle.color}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Capacity</span>
                                    <span className="font-bold text-slate-700 capitalize">{vehicle.max_package_size.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Type</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                        value={formData.vehicle_type}
                                        onChange={e => setFormData({ ...formData, vehicle_type: e.target.value as any })}
                                    >
                                        <option value="motorcycle">Motorcycle</option>
                                        <option value="car">Car</option>
                                        <option value="van">Van</option>
                                        <option value="truck">Truck</option>
                                        <option value="bicycle">Bicycle</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">License Plate</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                        value={formData.license_plate || ''}
                                        onChange={e => setFormData({ ...formData, license_plate: e.target.value })}
                                        placeholder="KBA 123A"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Make (e.g. Toyota)"
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                    value={formData.make || ''}
                                    onChange={e => setFormData({ ...formData, make: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Model (e.g. Vitz)"
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                    value={formData.model || ''}
                                    onChange={e => setFormData({ ...formData, model: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Color"
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                    value={formData.color || ''}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Year"
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold border-transparent focus:bg-white focus:border-orange-500 focus:ring-0 transition-all"
                                    value={formData.year || ''}
                                    onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Max Package Size</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['small', 'medium', 'large', 'extra_large'].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => setFormData({ ...formData, max_package_size: size as any })}
                                            className={`px-2 py-2 rounded-xl text-xs font-bold uppercase transition-all ${formData.max_package_size === size
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                                }`}
                                        >
                                            {size.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all"
                            >
                                Save Vehicle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
