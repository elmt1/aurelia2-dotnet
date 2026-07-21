import { IHttpClient } from '@aurelia/fetch-client';
import { inject } from 'aurelia';
import { HttpClientService } from '../http-client/http-client-service.js';
import type { Product } from './product.js';

export class ProductServiceError extends Error {
    constructor(message: string, public readonly status: number) {
        super(message);
    }
}

@inject(IHttpClient)
export class ProductService {

    constructor(private readonly http: IHttpClient) {
        HttpClientService.configure(this.http);
    }

    async getProductList(): Promise<Product[]> {
        HttpClientService.storeReturnUrl('/product-list');

        const response = await this.http.fetch('/api/product/ProductList', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new ProductServiceError('Failed to fetch product list', response.status);
        }

        return await response.json() as Product[];
    }
}