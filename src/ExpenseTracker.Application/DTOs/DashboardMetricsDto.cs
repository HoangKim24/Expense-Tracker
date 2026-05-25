namespace ExpenseTracker.Application.DTOs;

public class DashboardMetricsDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal Balance { get; set; }
    public List<CategoryBreakdownDto> CategoryBreakdown { get; set; } = new();
}

public class CategoryBreakdownDto
{
    public string CategoryName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public double Percentage { get; set; }
}
