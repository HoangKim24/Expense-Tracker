using ExpenseTracker.Domain.Enums;
using ExpenseTracker.Infrastructure.Services.Gmail.Parsers;
using MimeKit;
using Xunit;

namespace ExpenseTracker.Application.Tests;

public class EmailParsersTests
{
    [Fact]
    public void MoMoEmailParser_ShouldParse_ValidPaymentEmail()
    {
        // Arrange
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("MoMo", "no-reply@momo.vn"));
        message.Subject = "Thông báo giao dịch thành công";
        message.Body = new TextPart("plain")
        {
            Text = @"Bạn vừa thanh toán thành công qua MoMo!
Mã giao dịch: 24890123456
Dịch vụ: Highlands Coffee
Số tiền: 45.000đ
Thời gian: 19/09/2026 09:30:15
Cảm ơn quý khách!"
        };

        // Act
        var result = MoMoEmailParser.Parse(message);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(45000m, result.Amount);
        Assert.Equal("MOMO_24890123456", result.ExternalReference);
        Assert.Equal("Highlands Coffee", result.Merchant);
        Assert.Equal(TransactionSource.MoMo, result.Source);
        Assert.True(result.IsExpense);
    }

    [Fact]
    public void MoMoEmailParser_ShouldIgnore_PromoEmail()
    {
        // Arrange
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("MoMo", "no-reply@momo.vn"));
        message.Subject = "Tặng bạn Voucher giảm giá 50% ăn uống cuối tuần";
        message.Body = new TextPart("plain")
        {
            Text = @"Khám phá ngay hàng ngàn ưu đãi hấp dẫn trên ứng dụng MoMo!
Nhận quà liền tay khi mở MoMo săn deal hôm nay!"
        };

        // Act
        var result = MoMoEmailParser.Parse(message);

        // Assert
        Assert.Null(result); // Phải bỏ qua email quảng cáo/khuyến mãi
    }

    [Fact]
    public void CakeEmailParser_ShouldParse_ValidBalanceFluctuation()
    {
        // Arrange
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("Cake by VPBank", "no-reply@cake.vn"));
        message.Subject = "Thông báo biến động số dư tài khoản Cake";
        message.Body = new TextPart("plain")
        {
            Text = @"Kính gửi quý khách,
Tài khoản Cake của quý khách vừa phát sinh giao dịch:
Số tiền: -120.000 VND
Số tham chiếu: FT24262908711234
Nội dung: Chuyen tien mua banh kem
Người nhận: NGUYEN VAN A
Thời gian: 19/09/2026 10:15:00"
        };

        // Act
        var result = CakeEmailParser.Parse(message);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(120000m, result.Amount);
        Assert.Equal("CAKE_FT24262908711234", result.ExternalReference);
        Assert.Equal("NGUYEN VAN A", result.Merchant);
        Assert.Equal(TransactionSource.Cake, result.Source);
        Assert.True(result.IsExpense);
    }

    [Fact]
    public void CakeEmailParser_ShouldIgnore_NonExpenseEmail()
    {
        // Arrange
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("Cake by VPBank", "no-reply@cake.vn"));
        message.Subject = "Mở thẻ tín dụng Cake nhận quà tặng lên tới 1 triệu";
        message.Body = new TextPart("plain")
        {
            Text = @"Đăng ký ngay tài khoản tiết kiệm Cake với lãi suất hấp dẫn và tham gia chương trình săn quà!"
        };

        // Act
        var result = CakeEmailParser.Parse(message);

        // Assert
        Assert.Null(result);
    }
}
