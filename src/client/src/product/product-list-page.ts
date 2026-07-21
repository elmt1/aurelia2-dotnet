import { ProductService, ProductServiceError } from './product-service.js';
import type { Product } from './product.js';
import { inject } from '@aurelia/kernel';

@inject(ProductService)
export class ProductListPage {
    public products: Product[] = [];
    public message = '';

    constructor(private readonly productService: ProductService) { }

    public async attaching() {
        try {
            this.products = await this.productService.getProductList();
            this.message = '';
        } catch (error) {
            if (error instanceof ProductServiceError && (error.status === 401 || error.status === 403)) {
                this.products = [];
                this.message = 'Please log in with a verified customer account to view products.';
                return;
            }

            console.error('Error loading product list:', error);
            this.message = 'Unable to load products.';
        }
    }
}