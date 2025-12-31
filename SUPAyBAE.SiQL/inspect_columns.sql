-- Run this to see what columns ACTUALLY exist
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE table_name IN ('orders', 'order_items', 'products')
ORDER BY table_name, column_name;
