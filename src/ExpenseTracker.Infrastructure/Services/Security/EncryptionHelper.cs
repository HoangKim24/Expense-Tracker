using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace ExpenseTracker.Infrastructure.Services.Security;

public class EncryptionHelper
{
    private readonly string _secretKey;

    public EncryptionHelper(IConfiguration configuration)
    {
        // 32 chars = 256 bits for AES-256
        var secretKey = configuration["Encryption:SecretKey"];

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException(
                "Encryption:SecretKey is not configured. " +
                "Set a 32-character secret via appsettings, user-secrets, or the Encryption__SecretKey environment variable.");
        }

        if (secretKey.Length != 32)
        {
            throw new InvalidOperationException(
                $"Encryption:SecretKey must be exactly 32 characters long for AES-256 (current length: {secretKey.Length}).");
        }

        _secretKey = secretKey;
    }

    public string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText)) return plainText;

        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(_secretKey);
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.GenerateIV(); // Sinh IV ngẫu nhiên

        var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream();
        
        // Ghi IV ở đầu chuỗi mã hóa để dùng khi giải mã
        ms.Write(aes.IV, 0, aes.IV.Length);
        
        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return cipherText;

        var fullCipher = Convert.FromBase64String(cipherText);

        using var aes = Aes.Create();
        aes.Key = Encoding.UTF8.GetBytes(_secretKey);
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        // Đọc IV từ 16 byte đầu tiên
        var iv = new byte[16];
        Array.Copy(fullCipher, 0, iv, 0, iv.Length);
        aes.IV = iv;

        using var ms = new MemoryStream(fullCipher, iv.Length, fullCipher.Length - iv.Length);
        using var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        
        return sr.ReadToEnd();
    }
}
