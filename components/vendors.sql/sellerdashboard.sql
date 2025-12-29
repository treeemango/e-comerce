B. $\text{vw\_seller\_inventory\_summary}$ (Inventory Report)SQL-- View for inventory status, showing stock and sales velocity
CREATE OR REPLACE VIEW vw_seller_inventory_summary AS
SELECT
    p.seller_id AS business_id,
    p.id AS product_id,
    p.title AS product_title,
    pv.id AS variant_id,
    pv.sku,
    pv.stock AS current_stock,
    (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.variant_id = pv.id AND oi.business_id = p.seller_id) AS total_sales_to_date,
    pv.price AS current_price,
    MAX(p.updated_at) AS last_updated
FROM 
    products p
JOIN 
    product_variants pv ON p.id = pv.product_id
GROUP BY 1, 2, 3, 4, 5, 6, 8
ORDER BY 3;

B. Rating Function and Trigger
SQL

-- fn_update_product_ratings: Updates average rating on the products table
CREATE OR REPLACE FUNCTION fn_update_product_ratings()
RETURNS trigger AS $$
BEGIN
    DECLARE
        target_product_id uuid := COALESCE(NEW.product_id, OLD.product_id);
    BEGIN
        UPDATE products
        SET 
            rating = (SELECT AVG(rating) FROM reviews WHERE product_id = target_product_id),
            review_count = (SELECT COUNT(id) FROM reviews WHERE product_id = target_product_id),
            updated_at = now()
        WHERE id = target_product_id;
    END;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger Definition
CREATE TRIGGER trg_review_update_product
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION fn_update_product_ratings();

A. Fulfillment Function (Stock Control)
SQL

-- fn_process_order_fulfillment: Handles atomic stock reduction
CREATE OR REPLACE FUNCTION fn_process_order_fulfillment(
    p_variant_id uuid,
    p_quantity integer
)
RETURNS void AS $$
DECLARE
    v_current_stock integer;
BEGIN
    -- Use pessimistic lock to ensure transactional integrity
    SELECT stock INTO v_current_stock 
    FROM product_variants 
    WHERE id = p_variant_id 
    FOR UPDATE;

    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for variant %', p_variant_id;
    END IF;

    -- Reduce stock in product_variants
    UPDATE product_variants
    SET stock = stock - p_quantity
    WHERE id = p_variant_id;

END;
$$ LANGUAGE plpgsql;
 $\text{SQL}$ Fix: Adding the Missing order_id ColumnsRun the following commands to add the order_id column to the transactions and reviews tables.1. Fix the transactions TableThe order_id in transactions is nullable because a transaction can be a payout or fee not directly tied to a specific order.SQL-- Add the order_id column to the transactions table
ALTER TABLE transactions
ADD COLUMN order_id uuid;

-- Rerun the constraint
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
2. Fix the reviews TableThe order_id in reviews is also nullable because a review might be left by a guest or tied to an old, archived order.SQL-- Add the order_id column to the reviews table
ALTER TABLE reviews
ADD COLUMN order_id uuid;

-- Rerun the constraint
ALTER TABLE reviews
ADD CONSTRAINT fk_reviews_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
✅ Next Steps: Final Remaining ConstraintsOnce the above commands are executed, you only need to run the remaining constraints that haven't produced an "already exists" error yet:SQL-- -----------------------------------------------------------------------------
-- 🎯 Final Missing Constraints
-- -----------------------------------------------------------------------------

-- 1. Link order_items to the general Product
-- You still need to link the order_items to the general product_id
ALTER TABLE order_items 
ADD CONSTRAINT fk_items_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- 2. Link Transactions to Seller (business)
-- This was likely missed or failed
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_business
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;

-- 3. Link Reviews to Product
-- This was likely missed or failed
ALTER TABLE reviews
ADD CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
Action: Execute the $\text{SQL}$ commands in the order they are listed above.