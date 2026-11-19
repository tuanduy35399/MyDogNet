using BackEnd.Controllers;
using BackEnd.Data;
using BackEnd.DTOs;
using BackEnd.DTOs.PostDTOs;
using BackEnd.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace BackEnd.Tests
{
    public class PostControllerTests
    {
        private ApplicationDbContext GetInMemoryDbContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;

            var context = new ApplicationDbContext(options);
            return context;
        }

        private async Task SeedDataAsync(ApplicationDbContext context)
        {
            var author = new Admin
            {
                Id = "author-1",
                UserName = "tuanduyhandsome",
                Email = "author@mydognet.test"
            };
            context.Users.Add(author);

            var posts = new List<Post>();
            for (int i = 1; i <= 12; i++)
            {
                posts.Add(new Post
                {
                    Id = i,
                    Title = i switch
                    {
                        1 => "Lập trình C# & .NET Core toàn tập",
                        2 => "Nuôi dạy chó Poodle + Corgi",
                        3 => "Hỏi đáp: Tại sao chó sủa vào ban đêm?",
                        _ => $"Bài viết kiến thức số {i}"
                    },
                    Content = $"<p>Nội dung chi tiết bài viết {i}</p>",
                    AuthorId = author.Id,
                    IsPublished = true,
                    CreatedAt = DateTime.UtcNow.AddMinutes(i),
                    UpdatedAt = DateTime.UtcNow.AddMinutes(i),
                    ViewCount = i * 10
                });
            }

            context.Posts.AddRange(posts);
            await context.SaveChangesAsync();
        }

        [Fact]
        public async Task TC_HT02_04_BoundaryConditions_PageNumberLessThanOne_ReturnsBadRequest()
        {
            // Arrange
            var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
            var controller = new PostController(context);

            // Act
            var result0 = await controller.GetPosts(pageNumber: 0, pageSize: 5);
            var resultNegative = await controller.GetPosts(pageNumber: -1, pageSize: 5);

            // Assert
            Assert.IsType<BadRequestObjectResult>(result0);
            Assert.IsType<BadRequestObjectResult>(resultNegative);
        }

        [Fact]
        public async Task TC_HT02_04_BoundaryConditions_PageSizeOutOfBounds_ReturnsBadRequest()
        {
            // Arrange
            var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
            var controller = new PostController(context);

            // Act: pageSize < 1 or pageSize > 50
            var resultZero = await controller.GetPosts(pageNumber: 1, pageSize: 0);
            var resultExceed = await controller.GetPosts(pageNumber: 1, pageSize: 51);

            // Assert
            Assert.IsType<BadRequestObjectResult>(resultZero);
            Assert.IsType<BadRequestObjectResult>(resultExceed);
        }

        [Fact]
        public async Task TC_HT02_04_ValidPaginationBounds_ReturnsOk()
        {
            // Arrange
            var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
            await SeedDataAsync(context);
            var controller = new PostController(context);

            // Act
            var resultMin = await controller.GetPosts(pageNumber: 1, pageSize: 1);
            var resultMax = await controller.GetPosts(pageNumber: 1, pageSize: 50);

            // Assert
            Assert.IsType<OkObjectResult>(resultMin);
            Assert.IsType<OkObjectResult>(resultMax);
        }

        [Fact]
        public async Task TC_HT02_01_SpecialCharactersSearch_AmpersandAndPlus_FiltersCorrectly()
        {
            // Arrange
            var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
            await SeedDataAsync(context);
            var controller = new PostController(context);

            // Act: Search for "C# & .NET"
            var resultAmp = await controller.GetPosts(pageNumber: 1, pageSize: 5, searchTerm: "C# & .NET");
            var okResultAmp = Assert.IsType<OkObjectResult>(resultAmp);
            var pagedDataAmp = Assert.IsType<PagedResponse<GetAllPost>>(okResultAmp.Value);

            // Act: Search for "Poodle + Corgi"
            var resultPlus = await controller.GetPosts(pageNumber: 1, pageSize: 5, searchTerm: "Poodle + Corgi");
            var okResultPlus = Assert.IsType<OkObjectResult>(resultPlus);
            var pagedDataPlus = Assert.IsType<PagedResponse<GetAllPost>>(okResultPlus.Value);

            // Act: Search for "?"
            var resultQuestion = await controller.GetPosts(pageNumber: 1, pageSize: 5, searchTerm: "?");
            var okResultQuestion = Assert.IsType<OkObjectResult>(resultQuestion);
            var pagedDataQuestion = Assert.IsType<PagedResponse<GetAllPost>>(okResultQuestion.Value);

            // Assert
            Assert.Single(pagedDataAmp.Data);
            Assert.Equal("Lập trình C# & .NET Core toàn tập", pagedDataAmp.Data[0].Title);

            Assert.Single(pagedDataPlus.Data);
            Assert.Equal("Nuôi dạy chó Poodle + Corgi", pagedDataPlus.Data[0].Title);

            Assert.Single(pagedDataQuestion.Data);
            Assert.Equal("Hỏi đáp: Tại sao chó sủa vào ban đêm?", pagedDataQuestion.Data[0].Title);
        }

        [Fact]
        public async Task TC_HT02_02_NonExistentSearchTerm_ReturnsEmptyListAndZeroTotalRecords()
        {
            // Arrange
            var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
            await SeedDataAsync(context);
            var controller = new PostController(context);

            // Act
            var result = await controller.GetPosts(pageNumber: 1, pageSize: 5, searchTerm: "Từ_khóa_không_hề_tồn_tại_xyz123");

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var pagedData = Assert.IsType<PagedResponse<GetAllPost>>(okResult.Value);

            Assert.Empty(pagedData.Data);
            Assert.Equal(0, pagedData.TotalRecords);
            Assert.Equal(0, pagedData.TotalPages);
        }

        [Fact]
        public async Task TC_HT02_03_MultiPageNavigation_HasCorrectTotalPagesAndStableOrdering()
        {
            // Arrange: 12 posts seeded, pageSize = 5 -> should produce 3 pages (5, 5, 2)
            var context = GetInMemoryDbContext(Guid.NewGuid().ToString());
            await SeedDataAsync(context);
            var controller = new PostController(context);

            // Act: Page 1
            var resPage1 = await controller.GetPosts(pageNumber: 1, pageSize: 5);
            var okPage1 = Assert.IsType<OkObjectResult>(resPage1);
            var dataPage1 = Assert.IsType<PagedResponse<GetAllPost>>(okPage1.Value);

            // Act: Page 2
            var resPage2 = await controller.GetPosts(pageNumber: 2, pageSize: 5);
            var okPage2 = Assert.IsType<OkObjectResult>(resPage2);
            var dataPage2 = Assert.IsType<PagedResponse<GetAllPost>>(okPage2.Value);

            // Act: Page 3
            var resPage3 = await controller.GetPosts(pageNumber: 3, pageSize: 5);
            var okPage3 = Assert.IsType<OkObjectResult>(resPage3);
            var dataPage3 = Assert.IsType<PagedResponse<GetAllPost>>(okPage3.Value);

            // Assert
            Assert.Equal(12, dataPage1.TotalRecords);
            Assert.Equal(3, dataPage1.TotalPages);
            Assert.Equal(5, dataPage1.Data.Count);
            Assert.Equal(5, dataPage2.Data.Count);
            Assert.Equal(2, dataPage3.Data.Count);

            // Verify stable ordering (CreatedAt descending, then Id descending)
            // Post 12 should be first because it has the latest CreatedAt
            Assert.Equal(12, dataPage1.Data[0].Id);
            Assert.Equal(11, dataPage1.Data[1].Id);
            Assert.Equal(10, dataPage1.Data[2].Id);
            Assert.Equal(9, dataPage1.Data[3].Id);
            Assert.Equal(8, dataPage1.Data[4].Id);

            // Page 2 starts with Post 7
            Assert.Equal(7, dataPage2.Data[0].Id);

            // Page 3 contains Posts 2 and 1
            Assert.Equal(2, dataPage3.Data[0].Id);
            Assert.Equal(1, dataPage3.Data[1].Id);
        }
    }
}
