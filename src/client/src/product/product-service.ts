import { IHttpClient } from '@aurelia/fetch-client';
import { inject } from 'aurelia';
import { HttpClientService } from '../http-client/http-client-service';
import type { Product } from './product';

@inject(IHttpClient)
export class ProductService {

    constructor(private readonly http: IHttpClient) {
        HttpClientService.configure(this.http);
    }

    async getProductList(): Promise<Product[]> {
        try {
            HttpClientService.storeReturnUrl('/product-list');

            const response = await this.http.fetch('api/product/ProductList', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch product list');
            }

            return await response.json() as Product[];

        } catch (error) {
            console.error('Error fetching product list:', error);
            throw error;
        }
    }
}