import React from 'react';

const AppsServiceView: React.FC = () => {
    const apps = [
        { id: 1, name: 'Inventory Sync', icon: 'sync', description: 'Sync your inventory across multiple channels.' },
        { id: 2, name: 'Tax Calculator', icon: 'calculate', description: 'Automate your tax calculations and reporting.' },
        { id: 3, name: 'Shipping Label Printer', icon: 'local_shipping', description: 'Print shipping labels directly from orders.' },
        { id: 4, name: 'Analytics Pro', icon: 'analytics', description: 'Advanced analytics for your store performance.' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Apps & Services</h1>
            <p className="text-gray-600">Explore tools to help you manage and grow your business.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map(app => (
                    <div key={app.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                            <span className="material-icons text-orange-600">{app.icon}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{app.name}</h3>
                        <p className="text-sm text-gray-600 mb-4">{app.description}</p>
                        <button className="text-orange-600 font-medium text-sm hover:underline">
                            Learn more
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-blue-900">Need a custom solution?</h3>
                    <p className="text-sm text-blue-700 mt-1">Our API allows you to build custom integrations for your specific needs.</p>
                </div>
                <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    View API Documentation
                </button>
            </div>
        </div>
    );
};

export default AppsServiceView;
