import { IHttpClient, json } from '@aurelia/fetch-client';
import { resolve, newInstanceOf } from 'aurelia';
import { Product } from './product';

export class ProductService {

    constructor(private readonly http: IHttpClient = resolve(newInstanceOf(IHttpClient))) {
    }

    async getProductList(): Promise<Product[]> {
        try {
            const response = await this.http.fetch('api/product/ProductList', {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch product list');
            }

            const products = await response.json();
            return products as Product[];

        } catch (error) {
            console.error('Error fetching product list:', error);
            throw error;
        }
    }
}