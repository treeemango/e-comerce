import { supabase } from './supabase';
import { OrderTrackingEvent } from '@/types';

/**
 * LogisticsWebhookHandler
 * Processes incoming callbacks from external carrier services (Sendy, DHL, Terminal Africa)
 * and syncs them with the internal OrderTrackingEvent system.
 */
export class LogisticsWebhookHandler {

    /**
     * Handle Sendy Order Event Webhook
     * Expects payload from Sendy callback: { order_no, event_name, message_push_time, location_name, ... }
     */
    static async handleSendyWebhook(payload: any): Promise<boolean> {
        const { order_no, event_name, message_push_time, location_name } = payload;

        if (!order_no || !event_name) {
            console.warn('[LogisticsWebhook] Invalid Sendy payload received');
            return false;
        }

        // Map Sendy events to internal OrderTrackingEvent types
        const eventMap: Record<string, OrderTrackingEvent['event_type']> = {
            'ORDER_PLACED': 'order_placed',
            'PICKUP_STARTED': 'preparing',
            'ARRIVED_AT_PICKUP': 'preparing',
            'PICKED_UP': 'picked_up',
            'IN_TRANSIT': 'in_transit',
            'ARRIVED_AT_DESTINATION': 'out_for_delivery',
            'DELIVERED': 'delivered',
            'ORDER_CANCELLED': 'cancelled',
            'ORDER_FAILED': 'failed_delivery'
        };

        const eventType = eventMap[event_name] || 'preparing';
        const description = `Sendy Update: ${event_name.replace(/_/g, ' ').toLowerCase()}`;

        try {
            // Find our internal order ID if Sendy uses a different reference (simulation)
            // For now assuming order_no is our internal ID or can be resolved
            const { error } = await supabase
                .from('order_tracking_events')
                .insert({
                    order_id: order_no,
                    event_type: eventType,
                    event_description: description,
                    location_name: location_name || undefined,
                    created_at: message_push_time || new Date().toISOString()
                });

            if (error) throw error;

            // Sync with main order status if critical event
            // Note: Use 'shipped' for main order if in_transit or picked_up
            const mainStatus = (eventType === 'delivered' || eventType === 'cancelled')
                ? eventType
                : (eventType === 'in_transit' || eventType === 'picked_up') ? 'shipped' : null;

            if (mainStatus) {
                await supabase
                    .from('orders')
                    .update({ status: mainStatus })
                    .eq('id', order_no);
            }

            return true;
        } catch (err) {
            console.error('[LogisticsWebhook] Failed to process Sendy webhook:', err);
            return false;
        }
    }

    /**
     * Handle Terminal Africa Webhook
     * Payload typically: { event_type: 'shipment.delivered', data: { shipment_id, reference, ... } }
     */
    static async handleTerminalAfricaWebhook(payload: any): Promise<boolean> {
        const { event_type, data } = payload;
        const orderId = data?.reference; // Assuming we pass order ID as reference

        if (!orderId || !event_type) return false;

        const terminalEventMap: Record<string, OrderTrackingEvent['event_type']> = {
            'shipment.created': 'order_confirmed',
            'shipment.pickup_successful': 'picked_up',
            'shipment.in_transit': 'in_transit',
            'shipment.out_for_delivery': 'out_for_delivery',
            'shipment.delivered': 'delivered',
            'shipment.cancelled': 'cancelled'
        };

        const internalEvent = terminalEventMap[event_type] || 'preparing';

        try {
            await supabase
                .from('order_tracking_events')
                .insert({
                    order_id: orderId,
                    event_type: internalEvent,
                    event_description: `Terminal Africa: ${event_type.split('.')[1]}`,
                    created_at: new Date().toISOString()
                });

            if (internalEvent === 'delivered') {
                await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
            } else if (internalEvent === 'in_transit' || internalEvent === 'picked_up') {
                await supabase.from('orders').update({ status: 'shipped' }).eq('id', orderId);
            } else if (internalEvent === 'cancelled') {
                await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
            }
            return true;
        } catch (err) {
            console.error('[TerminalWebhook] Failed:', err);
            return false;
        }
    }

    /**
     * Handle Generic Carrier Webhook
     */
    static async handleGenericWebhook(carrier: string, payload: any): Promise<boolean> {
        console.log(`[LogisticsWebhook] Received hook from ${carrier}`, payload);
        // Implement mapping logic for other carriers here
        return true;
    }
}
