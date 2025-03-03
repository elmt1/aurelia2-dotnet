import { ProductService } from './product-service';
import { Product } from './product';
import { inject } from '@aurelia/kernel';

@inject(ProductService)
export class ProductListPage {
    public products: Product[] = [];

    constructor(private readonly productService: ProductService) { }

    public async attaching() {
        try {
            this.products = await this.productService.getProductList();
        } catch (error) {
            console.error('Error loading product list:', error);
        }
    }
}