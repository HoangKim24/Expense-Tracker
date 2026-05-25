using ExpenseTracker.Domain.Enums;

namespace ExpenseTracker.Domain.Entities;

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Color { get; set; } = "#000000";
    public string Icon { get; set; } = string.Empty;
    public CategoryType Type { get; set; } = CategoryType.Expense;
    public decimal? Budget { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
