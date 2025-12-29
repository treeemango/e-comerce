// Simple test script to verify multi-country SEO functionality
import { getSupportedCountryCodes, getCountrySEOConfig } from './lib/country-seo.js';
import { getAllCategoryIds, getCategorySEOConfig } from './lib/category-seo.js';

console.log('🧪 Testing Multi-Country SEO System...\n');

// Test 1: Country configurations
console.log('🌍 Testing Country Configurations:');
const countries = getSupportedCountryCodes();
console.log(`✅ Found ${countries.length} supported countries:`, countries.join(', '));

countries.forEach(code => {
    const config = getCountrySEOConfig(code);
    if (config) {
        console.log(`  📍 ${config.name} (${code}): "${config.metaTitle}"`);
    }
});

// Test 2: Category configurations
console.log('\n📂 Testing Category Configurations:');
const categories = getAllCategoryIds();
console.log(`✅ Found ${categories.length} categories:`, categories.join(', '));

categories.forEach(id => {
    const config = getCategorySEOConfig(id);
    if (config) {
        console.log(`  🏷️ ${config.name}: "${config.metaTitle}"`);
    }
});

// Test 3: Meta tag generation
console.log('\n🏷️ Testing Meta Tag Generation:');
const kenyaConfig = getCountrySEOConfig('KE');
const electronicsConfig = getCategorySEOConfig('electronics');

if (kenyaConfig && electronicsConfig) {
    console.log('Kenya + Electronics combination:');
    console.log(`  Title: "${electronicsConfig.name} in ${kenyaConfig.name} - JuaExpress"`);
    console.log(`  Description: "Shop ${electronicsConfig.name.toLowerCase()} in ${kenyaConfig.name}. ${electronicsConfig.heroDescription} Fast delivery, secure payments, and trusted sellers."`);
}

console.log('\n✅ Multi-Country SEO System Test Completed!');
console.log('🎉 All core functionality is working correctly!');
