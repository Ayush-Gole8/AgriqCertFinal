import qrcode from 'qrcode-terminal';

// Mock certificate data with issuance offer URL
const mockOfferUrl = 'inji://credential-offer?tx=697cd9211791e455d99683e1';

console.log('\n' + '='.repeat(70));
console.log('🎫 CREDENTIAL ISSUANCE OFFER - DEMO');
console.log('='.repeat(70));

// Option A: QR Code (Best for Demo)
console.log('\n📱 Option A: Scan QR Code with Inji Wallet (RECOMMENDED)\n');
qrcode.generate(mockOfferUrl, { small: true });

// Option B: Clickable Link
console.log('\n🔗 Option B: Click Link (Web Wallet)');
console.log(`   ${mockOfferUrl}`);

console.log('\n' + '='.repeat(70));
console.log('📋 Instructions:');
console.log('   1. Open Inji Wallet app on your mobile device');
console.log('   2. Tap "Scan QR Code" or "Add Credential"');
console.log('   3. Scan the QR code above OR click the link');
console.log('   4. Review credential details and accept');
console.log('   5. Certificate will be added to your wallet!');
console.log('='.repeat(70));

console.log('\n✅ QR Code presentation feature implemented successfully!');
console.log('📝 This same presentation will appear when a real certificate is issued.');
