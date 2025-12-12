import React from 'react';

const FeaturesBar: React.FC = () => {
  return (
    <section className="mb-8 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex flex-col md:flex-row items-center justify-between text-sm text-yellow-800 dark:text-yellow-300 gap-4">
      <div className="flex items-center gap-2 font-medium">
        <span className="material-icons">info_outline</span>
        <span>Why choose us?</span>
      </div>
      <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8">
        <div className="flex items-center gap-2">
          <span className="material-icons">verified_user</span>
          <span>Secure payments</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons">local_shipping</span>
          <span>Delivery guarantee</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-icons">price_check</span>
          <span>Best prices</span>
        </div>
      </div>
    </section>
  );
};

export default FeaturesBar;