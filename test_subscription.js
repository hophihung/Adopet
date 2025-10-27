// Test script để kiểm tra subscription system
// Chạy trong Supabase SQL Editor

// 1. Kiểm tra subscription plans
SELECT '=== SUBSCRIPTION PLANS ===' as test;
SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order;

// 2. Kiểm tra plan features
SELECT '=== PLAN FEATURES ===' as test;
SELECT sp.name, pf.feature_key, pf.feature_name, pf.feature_value
FROM subscription_plans sp
LEFT JOIN plan_features pf ON sp.id = pf.plan_id
WHERE sp.is_active = true
ORDER BY sp.sort_order, pf.sort_order;

// 3. Kiểm tra profiles
SELECT '=== PROFILES ===' as test;
SELECT id, role, email, created_at 
FROM profiles 
WHERE role = 'seller' 
ORDER BY created_at DESC 
LIMIT 5;

// 4. Kiểm tra subscriptions
SELECT '=== SUBSCRIPTIONS ===' as test;
SELECT p.role, s.plan, sp.display_name, s.status, s.created_at
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.profile_id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE p.role = 'seller'
ORDER BY p.created_at DESC
LIMIT 5;

// 5. Kiểm tra trigger
SELECT '=== TRIGGERS ===' as test;
SELECT tgname, tgrelid::regclass as table_name, tgenabled
FROM pg_trigger 
WHERE tgname = 'trigger_auto_create_subscription_for_seller';

// 6. Test function
SELECT '=== TEST FUNCTION ===' as test;
SELECT ensure_seller_has_subscription('00000000-0000-0000-0000-000000000000'::uuid);
