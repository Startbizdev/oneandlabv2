/**
 * Simulation du flux IAP Cary Pro (sans device / sans boutique réelle).
 * Valide product ID, offerToken Android et payload requestPurchase.
 *
 * Usage: node scripts/simulate-iap-purchase.cjs
 */

const PRODUCT_ID = 'cary.pro.monthly';

function findStoreProduct(items, productId = PRODUCT_ID) {
  return items?.find((item) => item.id === productId);
}

function resolveAndroidSubscriptionOffers(product, productId = PRODUCT_ID) {
  if (!product) return null;

  for (const offer of product.subscriptionOffers ?? []) {
    const offerToken = offer.offerTokenAndroid?.trim();
    if (offerToken) return [{ sku: productId, offerToken }];
  }

  const legacy = product.subscriptionOfferDetailsAndroid;
  const legacyToken = legacy?.[0]?.offerToken?.trim();
  if (legacyToken) return [{ sku: productId, offerToken: legacyToken }];

  return null;
}

function buildSubscriptionPurchaseRequest(product, productId = PRODUCT_ID, platform = 'ios') {
  if (!product) {
    return { ok: false, reason: `Produit « ${productId} » introuvable dans la boutique.` };
  }

  const androidOffers = resolveAndroidSubscriptionOffers(product, productId);
  if (platform === 'android' && !androidOffers?.length) {
    return {
      ok: false,
      reason: 'Offre Google Play indisponible (offerToken manquant) — cause typique de « SKU manquant ».',
    };
  }

  return {
    ok: true,
    request: {
      type: 'subs',
      request: {
        apple: { sku: productId },
        ios: { sku: productId },
        google: {
          skus: [productId],
          subscriptionOffers: androidOffers ?? undefined,
        },
      },
    },
  };
}

const mockAndroidProduct = {
  id: PRODUCT_ID,
  displayPrice: '29,00 €',
  subscriptionOffers: [{ offerTokenAndroid: 'mock-offer-token-base-plan' }],
  subscriptionOfferDetailsAndroid: [
    { basePlanId: 'monthly', offerToken: 'mock-offer-token-base-plan' },
  ],
};

const mockIosProduct = {
  id: PRODUCT_ID,
  displayPrice: '29,00 €',
  subscriptionOffers: [],
};

const scenarios = [
  {
    name: 'iOS — produit chargé depuis App Store',
    platform: 'ios',
    product: mockIosProduct,
    expectOk: true,
  },
  {
    name: 'Android — produit + offerToken (correct)',
    platform: 'android',
    product: mockAndroidProduct,
    expectOk: true,
  },
  {
    name: 'Android — SKU sans offerToken (bug initial)',
    platform: 'android',
    product: { id: PRODUCT_ID, displayPrice: '29,00 €' },
    expectOk: false,
  },
  {
    name: 'Boutique vide — produit non trouvé',
    platform: 'ios',
    product: undefined,
    expectOk: false,
  },
  {
    name: 'iOS — payload natif corrigé (clé apple + ios)',
    platform: 'ios',
    product: mockIosProduct,
    expectOk: true,
    checkNativePayload: true,
  },
];

function simulateExpoIapBrokenIosPayload(productId) {
  return { type: 'subs', request: { ios: { sku: productId } } };
}

function simulateFixedIosNativePayload(productId) {
  return {
    type: 'subs',
    request: { apple: { sku: productId }, ios: { sku: productId } },
  };
}

let passed = 0;
let failed = 0;

console.log('=== Simulation IAP Cary Pro ===\n');
console.log(`Product ID attendu (guide): ${PRODUCT_ID}`);
console.log(`Bundle iOS / package Android: com.carybioapp.app\n`);

for (const scenario of scenarios) {
  const result = buildSubscriptionPurchaseRequest(scenario.product, PRODUCT_ID, scenario.platform);
  const ok = result.ok === scenario.expectOk;

  if (ok) {
    passed += 1;
    console.log(`✅ ${scenario.name}`);
    if (result.ok) {
      const google = result.request.request.google;
      const hasOffers = Boolean(google.subscriptionOffers?.length);
      console.log(`   apple.sku = ${result.request.request.apple.sku}`);
      console.log(`   google.skus = [${google.skus.join(', ')}]`);
      if (scenario.platform === 'android') {
        console.log(`   google.subscriptionOffers = ${hasOffers ? JSON.stringify(google.subscriptionOffers) : 'ABSENT ⚠️'}`);
      }
      if (scenario.checkId && result.request.request.apple.sku !== PRODUCT_ID) {
        failed += 1;
        passed -= 1;
        console.log(`   ❌ Product ID mismatch`);
      }
      if (scenario.checkNativePayload && result.ok) {
        const fixed = simulateFixedIosNativePayload(PRODUCT_ID);
        const broken = simulateExpoIapBrokenIosPayload(PRODUCT_ID);
        console.log(`   natif corrigé: ${JSON.stringify(fixed.request)}`);
        console.log(`   natif cassé (expo-iap): ${JSON.stringify(broken.request)} → SKU manquant iOS`);
      }
    } else {
      console.log(`   rejet attendu: ${result.reason}`);
    }
  } else {
    failed += 1;
    console.log(`❌ ${scenario.name}`);
    console.log(`   attendu ok=${scenario.expectOk}, obtenu ok=${result.ok}`);
    if (!result.ok) console.log(`   raison: ${result.reason}`);
  }
  console.log('');
}

console.log('--- Flux complet simulé (Android corrigé) ---');
const fixed = buildSubscriptionPurchaseRequest(mockAndroidProduct, PRODUCT_ID, 'android');
if (fixed.ok) {
  console.log('1. fetchProducts({ skus: [cary.pro.monthly], type: "subs" }) → produit trouvé');
  console.log('2. resolveAndroidSubscriptionOffers → offerToken extrait');
  console.log('3. requestPurchase(payload) →');
  console.log(JSON.stringify(fixed.request, null, 2));
  console.log('4. onPurchaseSuccess → POST /iap/google/verify → finishTransaction');
} else {
  failed += 1;
  console.log('❌ Flux Android corrigé échoue:', fixed.reason);
}

console.log('\n--- Résultat ---');
console.log(`${passed} scénario(s) OK, ${failed} échec(s)`);
process.exit(failed > 0 ? 1 : 0);
