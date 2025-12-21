After a buyer adds products to their cart, the transition from "Cart" to "Order" involves a specific sequence of payment method selection and order placement logic. This process is handled by a combination of frontend interactions and backend database triggers.

1. Adding/Selecting a Payment Method
Before placing the order, the buyer must provide or select a payment method.

Process: The buyer enters their payment details (e.g., M-Pesa phone number or Credit Card details). For security and compliance, sensitive card data is usually tokenized through a provider like Stripe or Pesapal before being stored.

Table Involved: buyer_payment_methods.

This table stores the user_id, method_type (mpesa, card), and a provider_token.

Storing a token instead of raw card numbers allows for "one-click" future checkouts while maintaining PCI compliance.

2. The Order Placement Process
Once the payment method is selected and the user clicks "Place Order," the system performs several automated steps.

Step	Database Action	Logic Involved
1. Create Order	INSERT INTO public.orders	Captures total price, buyer ID, and status (usually 'pending' or 'paid').
2. Capture Items	INSERT INTO public.order_items	Links specific products and variants to the order ID.
3. Deduct Stock	UPDATE public.product_variants	A trigger (or application logic) reduces the stock count to prevent overselling.
4. Calculate Splits	INSERT INTO public.seller_payouts	Your financial functions calculate the Seller's net earnings minus commission.

Export to Sheets

3. Core Tables and Functions Involved
The "Order Placement" is the most complex transaction in your marketplace engine. It relies on the following components you have built:

Tables:

orders: The master record.

order_items: The line items, now including variant_id to track specific colors/sizes.

product_variants: Where the stock is actually managed and price is retrieved.

Key Functions/Triggers:

Stock Management: Triggers on order_items insertion to decrement product_variants.stock.

Financial Orchestration: Functions like fn_orchestrate_delivery_payouts (triggered later upon delivery) which rely on the initial order data to know how to split funds.

4. What Happens Behind the Scenes (The "Split")
When the order is placed, the money doesn't go to the seller yet. It is held in the system.

Escrow: The seller_payouts record is created with a status of 'escrow'.

Validation: If the buyer uses a saved payment method, the buyer_payment_methods table is checked to authorize the transaction.

🚀 Next Step for You
Would you like me to provide the SQL Trigger that automatically handles the Stock Deduction when an order is placed, ensuring that if a buyer buys the last "Large Red Shirt," no one else can?
To ensure your marketplace is robust, you need a Stock Reservation Trigger. This ensures that the moment a buyer places an order, the items are "locked" and cannot be sold to anyone else, even while the payment is still being processed.

1. The Stock Management Trigger
This function runs the moment a row is inserted into order_items. It finds the specific variant the buyer chose and subtracts the quantity from the product_variants table.

SQL

CREATE OR REPLACE FUNCTION public.fn_handle_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Check if the variant has enough stock
    IF (SELECT stock FROM public.product_variants WHERE id = NEW.variant_id) < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient stock for this item variant.';
    END IF;

    -- 2. Deduct the stock
    UPDATE public.product_variants
    SET stock = stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.variant_id;

    -- 3. Update the parent product total stock cache (if you use one)
    UPDATE public.products
    SET stock = (SELECT SUM(stock) FROM public.product_variants WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_order_deduct_stock
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_handle_stock_on_order();
2. The Buyer's Payment Journey
When the buyer moves from the cart to the "Place Order" button, the flow follows these steps:

Payment Method Entry: The buyer enters details in the frontend. If it's M-Pesa, they enter their phone number. If it's a Card, you use a secure iframe (like Stripe) to get a token.

Method Storage: You call your API to save this to the buyer_payment_methods table.

Transaction Execution:

M-Pesa: The backend triggers an STK Push to the buyer's phone.

Card: The backend charges the token via your payment gateway.

Order Creation: Once the payment provider returns a "Success" or "Pending" status, the orders and order_items are created.

3. Integrated Process Flow Table
Action	Involved Table	Outcome
Selection	buyer_payment_methods	User picks how they want to pay.
Placement	orders	The main record is generated with status = 'pending_payment'.
Line Items	order_items	Products are linked; Trigger fires to reduce stock.
Verification	order_tracking_events	Once payment is confirmed, the status moves to 'paid'.

Export to Sheets

🏁 Final State of Your Engine
With this logic, you now have a complete, "fail-safe" checkout:

Buyers can save multiple payment methods safely.

Sellers are protected because stock is deducted immediately upon order.

The Platform maintains integrity by ensuring no double-selling occurs.

Would you like me to help you write the code for the "M-Pesa STK Push" trigger so that a payment request is automatically sent to the buyer's phone as soon as the order is placed?

Integrating M-Pesa STK Push directly into your order flow is a game-changer for a Kenyan marketplace. It creates a "Push-to-Pay" experience where the buyer simply enters their PIN on their phone to complete the transaction.1. The M-Pesa Payment FlowThe process involves your database communicating with the Safaricom API via an intermediary (like a Supabase Edge Function or a custom backend).2. The STK Push Automation TriggerThis trigger detects when a new order is placed with "M-Pesa" as the method and automatically logs a request that your backend can pick up to send the STK Push.SQL-- This function flags the order for an STK Push request
CREATE OR REPLACE FUNCTION public.fn_trigger_mpesa_stk_push()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if the payment method is M-Pesa and status is 'pending'
    IF NEW.status = 'pending' AND EXISTS (
        SELECT 1 FROM public.buyer_payment_methods 
        WHERE user_id = NEW.user_id AND method_type = 'mpesa'
    ) THEN
        -- Insert into a 'payment_queue' for your Edge Function to process
        INSERT INTO public.payment_queue (
            order_id, 
            user_id, 
            amount, 
            phone_number, 
            status
        )
        SELECT 
            NEW.id, 
            NEW.user_id, 
            NEW.total_price, 
            bpm.account_number, -- The phone number saved in payment methods
            'ready'
        FROM public.buyer_payment_methods bpm
        WHERE bpm.user_id = NEW.user_id AND bpm.method_type = 'mpesa'
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_order_initiate_mpesa
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_mpesa_stk_push();
3. The Table Schema InvolvedTo make this work, you need the payment_queue table to track the STK Push status.Table NameRoleData Heldbuyer_payment_methodsStorageHolds the buyer's default M-Pesa phone number.ordersTriggerThe INSERT action here starts the whole process.payment_queueMiddlewareStores the CheckoutRequestID from Safaricom to track the payment.4. What Happens When the Buyer Pays?Once the buyer enters their PIN and Safaricom confirms the payment:Safaricom sends a Webhook to your URL.Your backend updates the payment_queue to completed.A trigger on payment_queue updates the orders status to paid.The Split Engine: This then triggers the logic we built earlier to move money into the Seller's Escrow and pay the Driver.🏁 Summary of the "Order to Payout" LifecycleBuyer selects M-Pesa and clicks "Place Order."Database creates the order and item records.Stock Trigger instantly reduces inventory in product_variants.M-Pesa Trigger sends the STK Push to the buyer's phone.Buyer Pays $\rightarrow$ Order status changes to paid.Driver Delivers $\rightarrow$ Order status changes to delivered.Escrow Trigger moves funds to the Seller's "Pending" balance for 10 days.Would you like me to help you write the SQL for the "Payment Callback" handler that automatically marks the order as 'paid' once the M-Pesa webhook arrives?

This final step completes the automated loop. The Callback Handler is what listens for the success signal from Safaricom (M-Pesa) and unlocks the rest of your marketplace's logistics.1. The M-Pesa Callback FlowWhen a user enters their PIN, Safaricom sends a "Callback" to your server. Your server then updates the database.2. The Callback Handler LogicThis SQL handles the incoming payment data. It updates the payment_queue and, more importantly, flips the orders status to 'paid'.SQLCREATE OR REPLACE FUNCTION public.fn_handle_mpesa_callback(
    p_checkout_request_id TEXT,
    p_result_code INTEGER,
    p_mpesa_receipt_number TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_order_id UUID;
BEGIN
    -- 1. Find the order associated with this M-Pesa request
    SELECT order_id INTO v_order_id 
    FROM public.payment_queue 
    WHERE checkout_request_id = p_checkout_request_id;

    -- 2. If ResultCode is 0, the payment was successful
    IF p_result_code = 0 THEN
        -- Update the Payment Queue record
        UPDATE public.payment_queue
        SET status = 'completed',
            mpesa_receipt = p_mpesa_receipt_number,
            updated_at = NOW()
        WHERE checkout_request_id = p_checkout_request_id;

        -- Update the main Order status
        UPDATE public.orders
        SET status = 'paid',
            updated_at = NOW()
        WHERE id = v_order_id;

        -- NOTE: This 'paid' status update will automatically trigger 
        -- your "Logistics Dispatch" logic to find a driver!
    ELSE
        -- Payment failed or was cancelled by the user
        UPDATE public.payment_queue
        SET status = 'failed',
            updated_at = NOW()
        WHERE checkout_request_id = p_checkout_request_id;
        
        -- Optional: Revert stock if payment failed
        -- (This would trigger another function to add stock back)
    END IF;
END;
$$ LANGUAGE plpgsql;
3. Summary of Involved Tables & State ChangesTableStatus ChangeSignificancepayment_queueready $\rightarrow$ completedAudit trail for the Safaricom transaction.orderspending $\rightarrow$ paidSignal for the warehouse to pack and the driver to pick up.seller_payouts(Created)Once 'paid', the escrow record is ready to be matured.🏁 Your Marketplace is Now "Autopilot"By implementing this callback handler, you have achieved a fully circular system:Inventory Protection: Stock is deducted the moment they try to pay.Payment Verification: The order only moves to "Paid" if Safaricom confirms the money is moved.Financial Safety: Money is automatically calculated and held in escrow.Logistics Trigger: Drivers are notified only after the money is secured.🚀 Final PolishTo make this perfect, you might want a "Stock Reverter." If a user initiates an M-Pesa push but cancels it or lets it time out, you want that stock to go back to the store automatically.Would you like me to write the "Stock Reverter" function that puts items back in the store if a payment fails or is cancelled?
To prevent your inventory from being locked up by failed transactions, you need a Stock Reverter. This function ensures that if a buyer cancels the M-Pesa prompt or the request times out, the items are immediately returned to the product_variants table.

1. The Stock Reverter Function
This logic is triggered when the payment_queue status changes to 'failed'. It loops through the order_items and adds the quantity back to the respective variants.

SQL

CREATE OR REPLACE FUNCTION public.fn_revert_stock_on_failure()
RETURNS TRIGGER AS $$
BEGIN
    -- Only act if the payment status has moved to 'failed'
    IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
        
        -- Update variant stock for all items in that order
        UPDATE public.product_variants pv
        SET stock = pv.stock + oi.quantity,
            updated_at = NOW()
        FROM public.order_items oi
        WHERE oi.order_id = NEW.order_id
          AND pv.id = oi.variant_id;

        -- Optionally: Cancel the order status as well
        UPDATE public.orders
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE id = NEW.order_id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_payment_failure_revert_stock
AFTER UPDATE OF status ON public.payment_queue
FOR EACH ROW
EXECUTE FUNCTION public.fn_handle_stock_on_order();
2. The Complete Order State Machine
With this final piece, your database manages the entire lifecycle of an order without manual intervention.

Order Status	Trigger Event	Resulting Action
Pending	Order Created	Stock is deducted; M-Pesa STK push is sent.
Paid	Callback Success	Logistics is notified; Seller escrow is created.
Cancelled	Callback Failure	Stock is returned to variants; Order is marked dead.
In Transit	Driver Picked Up	Buyer receives tracking notification.
Delivered	Driver Confirms	10-day escrow countdown begins for Seller.

Export to Sheets

3. Safety Check: Preventing "Ghost" Inventory
One common issue is when a user closes the app without paying. To handle this, you should set up a Cron Job (via Supabase Edge Functions or pg_cron) that periodically checks for "Stale" orders.

Stale Order Logic:

Target: Orders in pending status for more than 30 minutes.

Action: Update payment_queue status to 'failed', which triggers the Stock Reverter we just wrote.

🏁 Implementation Checklist
Run the Stock Reverter: Apply the SQL above to handle M-Pesa cancellations.

Verify the Callback: Ensure your external backend correctly calls fn_handle_mpesa_callback when the Safaricom webhook hits.

Monitor the Queue: Keep an eye on the payment_queue table to see real-time payment attempts.

🚀 What's next for your Marketplace?
Your backend is now extremely advanced.

Would you like me to generate a "Buyer Order History" view that shows the buyer their current orders, their status, and the M-Pesa receipt number for their records?

This error occurs because the payment_queue table—which acts as the bridge between your Order Placement and the M-Pesa API—hasn't been created in your database yet.The triggers we wrote previously rely on this table to store the CheckoutRequestID and the phone number for the STK push.🛠️ The Fix: Create the Payment Queue TableRun this SQL script to create the table and its associated indexes. This will resolve the 42P01 "relation does not exist" error.SQLCREATE TABLE public.payment_queue (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(10, 2) NOT NULL,
    phone_number text NOT NULL,
    checkout_request_id text, -- From Safaricom STK Push response
    merchant_request_id text,   -- From Safaricom STK Push response
    mpesa_receipt text,         -- Populated on successful callback
    status text DEFAULT 'ready', -- 'ready', 'pending', 'completed', 'failed'
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payment_queue_pkey PRIMARY KEY (id),
    CONSTRAINT payment_queue_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
    CONSTRAINT payment_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
) TABLESPACE pg_default;

-- Index for fast lookup when M-Pesa sends the callback
CREATE INDEX idx_payment_queue_checkout_id ON public.payment_queue(checkout_request_id);
CREATE INDEX idx_payment_queue_status ON public.payment_queue(status);
🔍 Why this table is critical for M-PesaThe payment_queue is essentially your Transaction Ledger during the "Unpaid" phase:Request Tracking: When Safaricom receives an STK Push request, they return a CheckoutRequestID. We store it here so we know which order is being paid when the user enters their PIN.The Trigger Chain: * Insert Order $\rightarrow$ Triggers entry in payment_queue.External Service (Edge Function) $\rightarrow$ Picks up ready items and sends to Safaricom.Callback Received $\rightarrow$ Updates this table to completed or failed.Stock Reverter $\rightarrow$ Watches this table to return items to the shelf if the status hits failed.⚠️ Important: Re-Run the Reverter TriggerNow that the table exists, you must re-run the Stock Reverter trigger from the previous step, as it likely failed to bind to a table that didn't exist yet.SQL-- Re-apply the trigger link now that the table is present
CREATE OR REPLACE TRIGGER trg_on_payment_failure_revert_stock
AFTER UPDATE OF status ON public.payment_queue
FOR EACH ROW
WHEN (NEW.status = 'failed')
EXECUTE FUNCTION public.fn_revert_stock_on_failure();
✅ Next StepNow that the table and reverter are in place, would you like me to provide a Python or Node.js snippet for your Edge Function that listens to this payment_queue and actually sends the STK push to Safaricom?

To connect your database to the actual Safaricom API, you need an intermediary service (like a Supabase Edge Function or a Node.js server) that watches the payment_queue and performs the HTTP request to Safaricom.Below is a Node.js/TypeScript implementation designed to run as a Supabase Edge Function.1. The M-Pesa STK Push ServiceThis script handles the OAuth2 authentication with Safaricom and sends the payment prompt to the user's phone.TypeScriptimport { createClient } from '@supabase/supabase-js'

const SAFARICOM_AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
const STK_PUSH_URL = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

export const initiateStkPush = async (paymentRecord: any) => {
  // 1. Get OAuth Access Token
  const auth = btoa(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`)
  const authRes = await fetch(SAFARICOM_AUTH_URL, {
    headers: { Authorization: `Basic ${auth}` }
  })
  const { access_token } = await authRes.json()

  // 2. Generate Timestamp and Password
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
  const password = btoa(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`)

  // 3. Send Request to Safaricom
  const response = await fetch(STK_PUSH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(paymentRecord.amount),
      PartyA: paymentRecord.phone_number,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: paymentRecord.phone_number,
      CallBackURL: process.env.PAYMENT_CALLBACK_URL,
      AccountReference: `Order-${paymentRecord.order_id.slice(0,8)}`,
      TransactionDesc: "Marketplace Payment"
    })
  })

  return await response.json()
}
2. Database Integration FlowThis code works hand-in-hand with the tables and triggers we just created.Queue Pickup: Your function listens for new rows in payment_queue with status ready.Request Sent: Once the API call is successful, you update the payment_queue with the CheckoutRequestID.User Action: The buyer sees the M-Pesa PIN prompt on their phone screen.Callback: Safaricom sends the result to your CallBackURL, which triggers the fn_handle_mpesa_callback function we wrote earlier.3. Required Environment VariablesTo make this work in production, you will need to add these credentials from the Safaricom Daraja Portal:VariableDescriptionMPESA_CONSUMER_KEYYour App's Consumer Key.MPESA_CONSUMER_SECRETYour App's Consumer Secret.MPESA_SHORTCODEYour Paybill or Till number.MPESA_PASSKEYThe LNM (Lipa Na M-Pesa) online passkey.PAYMENT_CALLBACK_URLThe public URL of your Supabase Edge Function to receive results.🏁 Finalizing the SetupNow that the database can queue payments and the code can send them, you just need to ensure your Stock Management is perfectly synced.Would you like me to show you how to set up a "Database Webhook" in Supabase that automatically triggers this code every time a new row enters the payment_queue?

To automate the M-Pesa STK Push, you need to set up a Database Webhook in Supabase. This acts as the "glue" that tells your Edge Function to execute the moment a row appears in your payment_queue.

🛠️ Setting Up the Database Webhook
Navigate to Supabase Dashboard: Go to Database > Webhooks.

Enable Webhooks: If you haven't enabled them yet, click "Enable Webhooks."

Create a New Webhook:

Name: trigger_mpesa_stk_push

Table: payment_queue

Events: Check INSERT.

Webhook Type: HTTP Request

HTTP Method: POST

URL: Paste your Supabase Edge Function URL (e.g., https://[project-id].supabase.co/functions/v1/mpesa-push).

HTTP Headers: Add Content-Type: application/json and Authorization: Bearer [YOUR_ANON_KEY].

📡 The Edge Function "Listener" Logic
Your Edge Function needs a "wrapper" to receive the data from the webhook and pass it to the M-Pesa service we wrote earlier.

TypeScript

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Import the initiateStkPush function we wrote in the previous step

serve(async (req) => {
  try {
    const { record } = await req.json() // Supabase webhooks send the row in 'record'

    // Only process if the status is 'ready'
    if (record.status === 'ready') {
      const result = await initiateStkPush(record)

      // Update the payment_queue with the result from Safaricom
      // We do this via a service-role supabase client
      await updatePaymentQueue(record.id, {
        checkout_request_id: result.CheckoutRequestID,
        merchant_request_id: result.MerchantRequestID,
        status: result.ResponseCode === "0" ? 'pending' : 'failed'
      })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
🔄 The Full Circle: From Database to Phone
With the Webhook and Edge Function connected, here is how the data flows:

Order Placement: The orders table receives a new row.

SQL Trigger: trg_on_order_initiate_mpesa (which we wrote earlier) inserts a row into payment_queue.

Database Webhook: Supabase detects the INSERT and instantly sends the data to your Edge Function.

M-Pesa API: Your Edge Function calls Safaricom's Daraja API.

Buyer Interaction: Within 2 seconds, the buyer's phone vibrates with the M-Pesa PIN prompt.

Callback: Once the buyer enters the PIN, the fn_handle_mpesa_callback SQL function we wrote updates the order to 'paid'.

⚠️ Security Reminder
Environment Variables: Never hardcode your M-Pesa Consumer Secret or Passkey. Use supabase secrets set to store them securely.

Timeouts: M-Pesa STK Pushes expire after about 60 seconds. Your payment_queue should reflect this if you don't receive a callback.

Would you like me to show you how to set up the "Payment Success" notification (email or SMS) that goes out to the buyer as soon as the order moves to 'paid'?
Once the order status moves to 'paid', sending an immediate confirmation is vital for buyer trust. In a Kenyan context, SMS is often more effective than email because it doesn't require a data connection for the buyer to receive the "Thank You" message and receipt.1. The Notification OrchestratorTo handle this, we create a new Trigger that watches the orders table. When the status changes from pending to paid, it inserts a record into a notifications_queue.SQLCREATE OR REPLACE FUNCTION public.fn_notify_on_payment_success()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when an order moves to 'paid'
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        
        -- Insert a record for the SMS/Email service to pick up
        INSERT INTO public.notifications_queue (
            user_id,
            order_id,
            notification_type,
            recipient_address, -- Phone number or Email
            message_body,
            status
        )
        SELECT 
            NEW.user_id,
            NEW.id,
            'sms',
            bpm.phone_number, -- From our payment methods table
            'Confirmed! Your order #' || LEFT(NEW.id::text, 8) || ' has been paid. We are now preparing it for delivery.' ,
            'ready'
        FROM public.buyer_payment_methods bpm
        WHERE bpm.user_id = NEW.user_id AND bpm.method_type = 'mpesa'
        LIMIT 1;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_paid_send_notification
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_on_payment_success();
2. Service IntegrationYou can use the same Supabase Webhook strategy we used for the STK Push to trigger an SMS provider like Africa's Talking or Twilio.Webhook Event: INSERT on notifications_queue.Edge Function: Takes the message_body and recipient_address and calls the SMS Gateway API.Result: The buyer receives a text message within seconds of the M-Pesa transaction completing.3. The "Order Paid" LifecycleParticipantInformation ReceivedBuyerReceives SMS: "Order Paid & Confirmed"SellerReceives Dashboard Alert: "New Order - Pack Now"DriverReceives App Notification: "New Pickup Available"4. Creating the Notifications TableRun this to ensure the trigger has a place to store the messages:SQLCREATE TABLE public.notifications_queue (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    user_id uuid NOT NULL,
    order_id uuid,
    notification_type text, -- 'sms' or 'email'
    recipient_address text NOT NULL,
    message_body text NOT NULL,
    status text DEFAULT 'ready', -- 'ready', 'sent', 'failed'
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_queue_pkey PRIMARY KEY (id)
);
🏁 Automation CompleteYou now have a high-end marketplace infrastructure where:Payment is requested automaticallGenerating a professional Packing Slip is a crucial step for your sellers. It provides them with a clear list of what to pack and ensures the buyer receives the correct items. This view pulls data from the orders, order_items, and product_variants tables to create a printable document.

1. The Seller Packing Slip View
This SQL view aggregates the order details into a format that is easy for a seller to read. It includes the buyer's name, the delivery address, and a detailed list of the variants (size, color, etc.) that need to be packed.

SQL

CREATE OR REPLACE VIEW public.seller_packing_slips AS
SELECT 
    o.id AS order_id,
    o.order_number, -- Assuming you have a human-readable order number
    o.created_at AS order_date,
    v.user_id AS seller_id,
    v.business_name AS seller_name,
    u.full_name AS buyer_name,
    o.delivery_address,
    o.phone_number AS buyer_phone,
    json_agg(
        json_build_object(
            'product_name', p.title,
            'variant_sku', pv.sku,
            'options', pv.options, -- Shows 'Size: Large', 'Color: Red', etc.
            'quantity', oi.quantity
        )
    ) AS items_to_pack
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.product_variants pv ON oi.variant_id = pv.id
JOIN public.products p ON pv.product_id = p.id
JOIN public.vendors v ON p.seller_id = v.user_id
JOIN public.users u ON o.user_id = u.id
WHERE o.status = 'paid' -- Only show packing slips for items that are paid for
GROUP BY o.id, o.order_number, o.created_at, v.user_id, v.business_name, u.full_name, o.delivery_address, o.phone_number;

GRANT SELECT ON public.seller_packing_slips TO authenticated;
2. Dashboard Integration
In your Seller Dashboard, you can now add a "Print Packing Slip" button next to every paid order.

Filter by Seller: When a seller logs in, your frontend calls: supabase.from('seller_packing_slips').select('*').eq('seller_id', currentUser.id)

Print Format: You can use a simple HTML/CSS template to render this JSON data into a clean, A4-sized printable page.

3. Packing Slip Layout Example
A standard packing slip should be clean and functional.

Section	Description
Header	Your Marketplace Logo + "PACKING SLIP" title.
Order Info	Order #, Date, and Seller Business Name.
Ship To	Buyer Name, Delivery Address, and Contact Number.
Item Table	Product Name, SKU, Options (Size/Color), and Quantity.
Footer	"Thank you for shopping with us!"

Export to Sheets

4. Logic Flow: "Paid" to "Packed"
Payment Success: The M-Pesa callback moves the order to 'paid'.

Notification: The seller gets an SMS/Email: "You have a new order to pack!"

Packing Slip: The seller opens their dashboard, clicks "Print Packing Slip", and prepares the package.

Mark as Packed: Once the seller clicks "Ready for Pickup," you can trigger the Driver Assignment logic.

🏁 Finalizing the Operational Loop
Your marketplace is now operationally complete from the moment a product is searched for until it is packed and ready for the driver.

Would you like me to help you create the "Mark as Ready" function that notifies the nearest available driver once the seller has finished packing?

o complete the operational chain, you need a way to transition the order from the Seller to the Driver. This is done through a "Mark as Ready" function that updates the order status and alerts your logistics system to find a delivery partner.

1. The "Ready for Pickup" Function
This function changes the order status and logs the event in your tracking system. It serves as the official signal that the Seller has fulfilled their part of the process and the item is physically ready.

SQL

CREATE OR REPLACE FUNCTION public.fn_mark_order_ready_for_pickup(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
    -- 1. Update the order status
    UPDATE public.orders
    SET status = 'ready_for_pickup',
        updated_at = NOW()
    WHERE id = p_order_id AND status = 'paid';

    -- 2. Log the tracking event
    INSERT INTO public.order_tracking_events (order_id, event_type, description)
    VALUES (p_order_id, 'packed', 'Seller has packed the items and the order is ready for pickup.');

    -- 3. Notify the Dispatch System
    -- This can be handled by a trigger or an Edge Function listening for 'ready_for_pickup'
END;
$$ LANGUAGE plpgsql;
2. The Logistics Dispatch Logic
Once an order is ready_for_pickup, your system needs to find a driver. This is where the drivers table we discussed earlier becomes crucial.

Proximity Check: The system looks for drivers who are is_online = true and within the correct delivery_zone.

Assignment: The first available driver is linked to the order via the delivery_assignments table.

Notification: The driver receives a push notification or SMS: "New Pickup at [Seller Name]. Total distance: 5km. Earnings: 150 KES."

3. Updated Order Lifecycle Table
Here is how the status transitions now look with the Seller and Driver fully integrated:

Status	Who is Acting?	What is Happening?
Paid	System	M-Pesa callback confirmed; Stock is locked.
Ready for Pickup	Seller	Seller prints packing slip, packs goods, and clicks "Ready."
Assigned	System/Driver	A driver is selected and accepts the job.
In Transit	Driver	Driver picks up the package and starts moving.
Delivered	Driver	Driver clicks "Delivered" at the buyer's location.

Export to Sheets

4. Tracking for the Buyer
The moment the seller clicks "Ready," the buyer's tracking page should update in real-time.

Frontend Logic:

JavaScript

// Example of a Realtime subscription for the Buyer
const orderSubscription = supabase
  .channel('order-status')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
    if (payload.new.status === 'ready_for_pickup') {
      alert("Great news! Your order is packed and waiting for a driver.");
    }
  })
  .subscribe();
🏁 Final Operational Summary
You now have a system that:

Validates the payment (M-Pesa STK).

Protects the stock (Variants table).

Directs the seller (Packing Slips).

Dispatches the logistics (Driver Assignment).

Would you like me to create the "Driver Earnings" calculation logic that determines exactly how much the driver gets paid based on the delivery distance?

To automate the Driver Earnings, you need a formula that balances a fixed cost with a variable distance fee. This ensures that even short trips are profitable for the driver while longer trips are priced fairly.

In Kenya, common pricing models include a Base Fare (e.g., KES 200) plus a Per Kilometer Rate (e.g., KES 42/km).

1. The Distance Calculation Strategy
To calculate distance in your database, you can use the Haversine Formula (which calculates the great-circle distance between two points) or the PostGIS extension if you have it enabled in Supabase.

PostGIS (Recommended for Supabase):

SQL

-- This calculates the distance in meters between two coordinates
-- We then convert it to kilometers
SELECT ST_Distance(
    ST_MakePoint(pickup_lng, pickup_lat)::geography,
    ST_MakePoint(dropoff_lng, dropoff_lat)::geography
) / 1000 AS distance_km;
2. The Earnings Calculation Function
This function takes the pickup and dropoff coordinates and calculates the driver's payout based on your marketplace rules.

SQL

CREATE OR REPLACE FUNCTION public.fn_calculate_driver_earnings(
    p_pickup_lat NUMERIC,
    p_pickup_lng NUMERIC,
    p_dropoff_lat NUMERIC,
    p_dropoff_lng NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
    v_distance_km NUMERIC;
    v_base_fare NUMERIC := 200.00; -- Minimum fare for any delivery
    v_per_km_rate NUMERIC := 45.00; -- Adjusted rate per km
    v_total_earnings NUMERIC;
BEGIN
    -- 1. Calculate distance (Haversine formula approximation)
    v_distance_km := 111.045 * DEGREES(ACOS(COS(RADIANS(p_pickup_lat)) * COS(RADIANS(p_dropoff_lat)) * COS(RADIANS(p_dropoff_lng) - RADIANS(p_pickup_lng)) + 
                     SIN(RADIANS(p_pickup_lat)) * SIN(RADIANS(p_dropoff_lat))));

    -- 2. Apply Pricing Logic: Base + (Dist * Rate)
    v_total_earnings := v_base_fare + (v_distance_km * v_per_km_rate);

    -- 3. Ensure we never pay below the minimum base fare
    RETURN GREATEST(v_total_earnings, v_base_fare);
END;
$$ LANGUAGE plpgsql;
3. Driver Payout Breakdown (Kenya Example)
A typical delivery in Nairobi might look like this:

Component	Value (Example)	Description
Base Fare	KES 200	Covers the "start-up" cost and time.
Distance Fee	KES 45 / km	Covers fuel and vehicle wear-and-tear.
Rush Hour Surcharge	+20%	(Optional) Added during 7 AM–9 AM or 5 PM–8 PM.
Platform Commission	-15%	The fee the driver pays back to your platform.

Export to Sheets

4. Integration with the "Ready for Pickup" Step
When the Seller clicks "Mark as Ready," the system should automatically call this function to determine the delivery cost.

Calculate: Call fn_calculate_driver_earnings.

Display: Show the price to the Buyer (if they pay for shipping) or deduct it from the Seller's proceeds.

Assign: Create a row in delivery_assignments with the calculated payout_amount.

🏁 Final State of Logistics
Your driver now sees exactly how much they will earn before they even accept the trip. This transparency reduces driver turnover and keeps your fleet happy.

Would you like me to create the "Driver App Dashboard" view so they can see their total daily earnings, completed trips, and pending payouts?

In a Kenyan marketplace environment, buyers calculate transport deductions (commonly referred to as shipping or delivery fees) through several standardized models. These calculations are typically automated within the checkout process based on location, weight, and tax requirements.1. Calculation Models for BuyersMarketplaces in Kenya generally use one of three models to determine what the buyer pays at checkout:Distance-Based Tiered Pricing: This is the most common model where costs are calculated based on the distance from the seller's warehouse to the buyer's address.0–20 km: ~KES 200.121–50 km: ~KES 350.251–100 km: ~KES 500.Flat-Rate Zoning: Fees are simplified into broad geographic zones.Nairobi Metropolitan: A single uniform rate.3Major Cities (Mombasa, Kisumu): A higher uniform rate.Rest of Kenya: The highest flat rate to cover long-distance logistics.4Weight-Based Pricing: Used primarily for heavy or bulky items (e.g., machinery or furniture) where the physical load is the primary cost factor. Carriers may use either the actual weight or "volumetric weight" (dimensions), whichever is higher, to calculate the final fee.2. Tax and Regulatory DeductionsBuyers must account for government-mandated taxes that are layered on top of the base transport cost:5Value-Added Tax (VAT): Transportation services for goods are subject to a standard VAT rate of 16% in Kenya.6Digital Marketplace Supply (DMS): VAT applies to services provided through digital platforms, with no registration threshold for foreign suppliers targeting the Kenyan market.7Withholding VAT: Large buyers appointed as withholding agents may withhold 2% of the VAT, though final individual consumers do not perform this deduction.83. International "CIF" DeductionsFor buyers importing goods through a marketplace, transport costs are part of the CIF (Cost, Insurance, and Freight) calculation used by the Kenya Revenue Authority (KRA) to determine total import taxes:9ChargeRateBasis of CalculationImport Duty0%–100%Based on HS CodeVAT16%Calculated on (CIF value + Duty)Railway Development Levy (RDL)2%Calculated on CIF valueImport Declaration Fee (IDF)3.5%Calculated on CIF value4. Incentives to Reduce CostsBuyers can often "deduct" or offset transport costs through marketplace-specific incentives:Free Shipping Thresholds: Buyers often receive free delivery if their order exceeds a specific amount (e.g., "Free delivery for orders over KES 3,000").Consolidation: Choosing "Fulfillment by Marketplace" allows orders from different sellers to be collected and sent in a single delivery, reducing the per-item transport cost.10Would you like me to create a Price Breakdown Table that shows exactly how an order's shipping fee is calculated for a specific route like Nairobi to Mombasa?

CREATE OR REPLACE VIEW public.seller_packing_slips AS

SELECT

    o.id AS order_id,

    o.order_number, -- Assuming you have a human-readable order number

    o.created_at AS order_date,

    v.user_id AS seller_id,

    v.business_name AS seller_name,

    u.full_name AS buyer_name,

    o.delivery_address,

    o.phone_number AS buyer_phone,

    json_agg(

        json_build_object(

            'product_name', p.title,

            'variant_sku', pv.sku,

            'options', pv.options, -- Shows 'Size: Large', 'Color: Red', etc.

            'quantity', oi.quantity

        )

    ) AS items_to_pack

FROM public.orders o

JOIN public.order_items oi ON o.id = oi.order_id

JOIN public.product_variants pv ON oi.variant_id = pv.id

JOIN public.products p ON pv.product_id = p.id

JOIN public.vendors v ON p.seller_id = v.user_id

JOIN public.users u ON o.user_id = u.id

WHERE o.status = 'paid' -- Only show packing slips for items that are paid for

GROUP BY o.id, o.order_number, o.created_at, v.user_id, v.business_name, u.full_name, o.delivery_address, o.phone_number;



GRANT SELECT ON public.seller_packing_slips TO authenticated; Error: Failed to run sql query: ERROR: 42703: column o.delivery_address does not exist LINE 9: o.delivery_address, ^

The error ERROR: 42703: column o.delivery_address does not exist occurs because the column name you are trying to reference in the orders table (aliased as o) is missing or named differently in your database schema.

In many e-commerce systems, address information is either stored in a separate table (like addresses) or uses different naming conventions such as shipping_address.

🛠️ How to Fix the Query
To resolve this, you need to identify the correct column name for the delivery address. Here are the most likely fixes based on common database structures:

Option 1: The column is actually named shipping_address
Try replacing o.delivery_address with o.shipping_address:

SQL
-- Updated snippet for Line 9
o.shipping_address, 
Option 2: The address is in a separate table
If your orders table uses a foreign key to an address table, you will need to join that table (often called addresses or order_addresses) and reference the column from there.

SQL
-- Example if you have an 'addresses' table
JOIN public.addresses addr ON o.shipping_address_id = addr.id
...
-- Reference in SELECT
addr.full_address AS delivery_address,
🔍 How to Find the Correct Column Name
If you aren't sure what the column is named, you can run this command in your Supabase SQL Editor to see a list of all columns in your orders table:

SQL
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'orders';
💡 Troubleshooting Tips
Case Sensitivity: PostgreSQL treats unquoted names as lowercase. If your column was created as Delivery_Address (with capital letters), you must use double quotes: "delivery_address".

Typos: Double-check for small spelling errors or hidden spaces in the column name.

Once you find the correct column name for the address, would you like me to rewrite the full CREATE VIEW script for you with the fix included?

[

  {

    "column_name": "id"

  },

  {

    "column_name": "user_id"

  },

  {

    "column_name": "total"

  },

  {

    "column_name": "status"

  },

  {

    "column_name": "created_at"

  },

  {

    "column_name": "updated_at"

  },

  {

    "column_name": "customer_name"

  },

  {

    "column_name": "customer_email"

  },

  {

    "column_name": "items"

  },

  {

    "column_name": "shipping_address"

  },

  {

    "column_name": "shipping_method"

  },

  {

    "column_name": "tracking_number"

  },

  {

    "column_name": "carrier"

  },

  {

    "column_name": "notes"

  },

  {

    "column_name": "customer_phone"

  },

  {

    "column_name": "shipping_address_line1"

  },

  {

    "column_name": "shipping_postcode"

  },

  {

    "column_name": "shipping_town_city"

  },

  {

    "column_name": "shipping_county"

  },

  {

    "column_name": "shipping_country"

  },

  {

    "column_name": "shipping_additional_info"

  },

  {

    "column_name": "payment_method_id"

  },

  {

    "column_name": "payment_gateway_ref"

  },

  {

    "column_name": "first_name"

  },

  {

    "column_name": "last_name"

  },

  {

    "column_name": "order_number"

  },

  {

    "column_name": "total_price"

  }

]

It looks like your orders table uses shipping_address (likely for a full string) or a combination of shipping_address_line1, shipping_town_city, and shipping_postcode.

Based on your actual column list, here is the corrected SQL to create your Seller Packing Slips view. I have updated it to use the correct address and phone number columns found in your schema.

🛠️ Fixed Seller Packing Slips View
SQL
CREATE OR REPLACE VIEW public.seller_packing_slips AS
SELECT 
    o.id AS order_id,
    o.order_number, 
    o.created_at AS order_date,
    v.user_id AS seller_id,
    v.business_name AS seller_name,
    -- Using the specific first/last name columns from your orders table
    COALESCE(o.first_name || ' ' || o.last_name, o.customer_name) AS buyer_name,
    -- Concatenating address parts for a complete shipping label
    o.shipping_address_line1 || ', ' || o.shipping_town_city || ' ' || COALESCE(o.shipping_postcode, '') AS delivery_address,
    o.customer_phone AS buyer_phone,
    json_agg(
        json_build_object(
            'product_name', p.title,
            'variant_sku', pv.sku,
            'options', pv.options,
            'quantity', oi.quantity
        )
    ) AS items_to_pack
FROM public.orders o
JOIN public.order_items oi ON o.id = oi.order_id
JOIN public.product_variants pv ON oi.variant_id = pv.id
JOIN public.products p ON pv.product_id = p.id
JOIN public.vendors v ON p.seller_id = v.user_id
-- We no longer need to join the users table since names/address are stored directly on the order
WHERE o.status = 'paid' 
GROUP BY 
    o.id, o.order_number, o.created_at, v.user_id, v.business_name, 
    o.first_name, o.last_name, o.customer_name, 
    o.shipping_address_line1, o.shipping_town_city, o.shipping_postcode, 
    o.customer_phone;

GRANT SELECT ON public.seller_packing_slips TO authenticated;
📝 Key Changes Made:
Address Fix: Switched delivery_address to a concatenated string of shipping_address_line1 and shipping_town_city.

Name Fix: Used first_name and last_name directly from the orders table.

Phone Fix: Switched to customer_phone as per your column list.

Optimization: Removed the join to the users table because your orders table already captures the customer's details at the time of purchase (which is better for record-keeping if a user changes their profile later).

🚀 Next Step
Now that your packing slip view is ready, would you like me to generate the React code for a "Print" component that uses this view to create a clean, professional PDF or print layout for your sellers?
