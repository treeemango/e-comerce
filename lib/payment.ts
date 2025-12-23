/**
 * Payment Processor Abstraction Layer
 * 
 * This file provides a unified interface for payment processing.
 * Currently configured for Flutterwave integration.
 * 
 * SETUP REQUIRED:
 * 1. Create a Flutterwave account at https://flutterwave.com
 * 2. Obtain your Public and Secret API keys
 * 3. Set environment variables:
 *    - VITE_FLUTTERWAVE_PUBLIC_KEY (for frontend)
 *    - FLUTTERWAVE_SECRET_KEY (for Edge Function/backend only)
 * 4. Create a Supabase Edge Function for secure payment processing
 */

// Payment Session returned after initialization
export interface PaymentSession {
    transactionId: string;
    paymentLink?: string;
    stkPushReference?: string; // For M-Pesa STK Push
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    amount: number;
    currency: string;
    createdAt: string;
}

// Result from payment verification
export interface PaymentResult {
    success: boolean;
    transactionId: string;
    status: PaymentSession['status'];
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    mpesaReceipt?: string; // For M-Pesa transactions
    errorMessage?: string;
}

// Flutterwave configuration
export const FlutterwaveConfig = {
    publicKey: import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '',
    // NEVER expose secret key on frontend - use Edge Function
    isConfigured: () => !!FlutterwaveConfig.publicKey,
};

// Supported payment methods
export type PaymentMethodType = 'card' | 'mpesa' | 'bank_transfer' | 'ussd';

// Customer details for payment
export interface PaymentCustomer {
    email: string;
    phoneNumber: string;
    name: string;
}

/**
 * Payment Processor Interface
 * Implement this interface for different payment providers
 */
export interface PaymentProcessor {
    /**
     * Initialize a new payment session
     */
    initializePayment(
        amount: number,
        currency: string,
        customer: PaymentCustomer,
        paymentMethod: PaymentMethodType,
        orderId: string
    ): Promise<PaymentSession>;

    /**
     * Verify payment status (call after redirect/callback)
     */
    verifyPayment(transactionId: string): Promise<PaymentResult>;

    /**
     * Trigger M-Pesa STK Push (Kenya mobile money)
     */
    triggerMpesaSTKPush?(
        phoneNumber: string,
        amount: number,
        orderId: string
    ): Promise<PaymentSession>;
}

/**
 * PLACEHOLDER: Flutterwave implementation
 * 
 * To implement:
 * 1. Install Flutterwave SDK: npm install flutterwave-react-v3
 * 2. Create Edge Function for server-side operations
 * 3. Implement the PaymentProcessor interface
 */
export class FlutterwaveProcessor implements PaymentProcessor {
    async initializePayment(
        amount: number,
        currency: string,
        customer: PaymentCustomer,
        paymentMethod: PaymentMethodType,
        orderId: string
    ): Promise<PaymentSession> {
        // TODO: Implement Flutterwave payment initialization
        // This should call your Edge Function which uses the secret key
        console.log('Flutterwave payment initialization', { amount, currency, customer, paymentMethod, orderId });

        throw new Error('Flutterwave integration not yet configured. Please set up API keys.');
    }

    async verifyPayment(transactionId: string): Promise<PaymentResult> {
        // TODO: Implement payment verification via Edge Function
        console.log('Verifying payment:', transactionId);

        throw new Error('Flutterwave integration not yet configured.');
    }

    async triggerMpesaSTKPush(
        phoneNumber: string,
        amount: number,
        orderId: string
    ): Promise<PaymentSession> {
        // TODO: Implement M-Pesa STK Push via Edge Function
        // This triggers a payment prompt on the customer's phone
        console.log('Triggering M-Pesa STK Push:', { phoneNumber, amount, orderId });

        throw new Error('M-Pesa integration not yet configured.');
    }
}

// Export singleton instance
export const paymentProcessor = new FlutterwaveProcessor();

/**
 * Helper function to format amount for display
 */
export const formatPaymentAmount = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
    }).format(amount);
};
