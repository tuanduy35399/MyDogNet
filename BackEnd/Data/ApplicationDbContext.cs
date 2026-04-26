using BackEnd.Models;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Data
{
    public class ApplicationDbContext: DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> opts) : base(opts) { }
        public DbSet<Admin> Admins => Set<Admin>();
        public DbSet<Post> Posts => Set<Post>();

    }
}
