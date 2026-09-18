using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Application.DTOs;

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public CategoryType Type { get; set; }
    public decimal? Budget { get; set; }
}
