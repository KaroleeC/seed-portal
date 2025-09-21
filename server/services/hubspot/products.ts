import { cache, CacheTTL } from '../../cache.js';
import type { HubSpotRequestFn } from './http.js';

export function createProductsService(request: HubSpotRequestFn) {
  async function getProducts(): Promise<any[]> {
    try {
      console.log('🔍 FETCHING ALL HUBSPOT PRODUCTS...');
      const result = await request('/crm/v3/objects/products');
      console.log('🔍 ALL HUBSPOT PRODUCTS:');
      if (result?.results) {
        result.results.forEach((product: any) => {
          console.log(
            `  ID: ${product.id} | Name: "${product.properties?.name}" | SKU: ${product.properties?.hs_sku}`
          );
        });
      }
      return result?.results || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async function getProductsCached(): Promise<any[]> {
    try {
      return await cache.wrap('hs:products:all', () => getProducts(), { ttl: CacheTTL.ONE_DAY });
    } catch (error) {
      console.error('Error fetching cached products, falling back:', error);
      return await getProducts();
    }
  }

  async function verifyAndGetProductIds(productIds: {
    MONTHLY_BOOKKEEPING: string;
    CLEANUP_PROJECT: string;
  }): Promise<{ bookkeeping: string; cleanup: string; valid: boolean }> {
    try {
      console.log('🔍 VERIFYING HUBSPOT PRODUCT IDS');

      const currentIds = {
        bookkeeping: productIds.MONTHLY_BOOKKEEPING,
        cleanup: productIds.CLEANUP_PROJECT,
      };

      let bookkeepingValid = false;
      let cleanupValid = false;

      try {
        await request(`/crm/v3/objects/products/${currentIds.bookkeeping}`);
        bookkeepingValid = true;
        console.log(`✅ Bookkeeping product ID ${currentIds.bookkeeping} is valid`);
      } catch {
        console.log(`❌ Bookkeeping product ID ${currentIds.bookkeeping} is invalid`);
      }

      try {
        await request(`/crm/v3/objects/products/${currentIds.cleanup}`);
        cleanupValid = true;
        console.log(`✅ Cleanup product ID ${currentIds.cleanup} is valid`);
      } catch {
        console.log(`❌ Cleanup product ID ${currentIds.cleanup} is invalid`);
      }

      if (bookkeepingValid && cleanupValid) {
        console.log('🎉 All product IDs are valid');
        return { ...currentIds, valid: true };
      }

      console.log('🔍 Searching for alternative products...');
      const products = await getProducts();

      let altBookkeeping = currentIds.bookkeeping;
      let altCleanup = currentIds.cleanup;

      for (const product of products) {
        const name = product.properties?.name?.toLowerCase() || '';
        const sku = product.properties?.hs_sku?.toLowerCase() || '';

        if (
          !bookkeepingValid &&
          (name.includes('bookkeeping') || name.includes('monthly') || sku.includes('book'))
        ) {
          altBookkeeping = product.id;
          bookkeepingValid = true;
          console.log(`🔄 Found alternative bookkeeping product: ${product.id} - ${product.properties?.name}`);
        }

        if (
          !cleanupValid &&
          (name.includes('cleanup') || name.includes('catch') || name.includes('setup') || sku.includes('setup'))
        ) {
          altCleanup = product.id;
          cleanupValid = true;
          console.log(`🔄 Found alternative cleanup product: ${product.id} - ${product.properties?.name}`);
        }
      }

      return {
        bookkeeping: altBookkeeping,
        cleanup: altCleanup,
        valid: bookkeepingValid && cleanupValid,
      };
    } catch (error) {
      console.error('❌ Error verifying product IDs:', error);
      return {
        bookkeeping: productIds.MONTHLY_BOOKKEEPING,
        cleanup: productIds.CLEANUP_PROJECT,
        valid: false,
      };
    }
  }

  return {
    getProducts,
    getProductsCached,
    verifyAndGetProductIds,
  };
}
