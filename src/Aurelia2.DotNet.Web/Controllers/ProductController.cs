using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aurelia2.DotNet.Web.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        [HttpGet("ProductList")]
        [Authorize(Policy = "VerifiedCustomer")]
        public IActionResult ProductList()
        {
            var products = GenerateRandomProducts(10);
            return Ok(products);
        }

        private static List<Product> GenerateRandomProducts(int count)
        {
            var random = new Random();
            var products = new List<Product>();

            for (int i = 0; i < count; i++)
            {
                products.Add(new Product
                {
                    Id = Guid.NewGuid(),
                    Name = $"Product {i + 1}",
                    Price = random.Next(1, 100)
                });
            }

            return products;
        }

        public class Product
        {
            public Guid Id { get; set; }
            public required string Name { get; set; }
            public decimal Price { get; set; }
        }
    }
}