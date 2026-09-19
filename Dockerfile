# Multi-stage build for ASP.NET Core 8 Web API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files for caching layer
COPY ["src/ExpenseTracker.Domain/ExpenseTracker.Domain.csproj", "ExpenseTracker.Domain/"]
COPY ["src/ExpenseTracker.Application/ExpenseTracker.Application.csproj", "ExpenseTracker.Application/"]
COPY ["src/ExpenseTracker.Infrastructure/ExpenseTracker.Infrastructure.csproj", "ExpenseTracker.Infrastructure/"]
COPY ["src/ExpenseTracker.Api/ExpenseTracker.Api.csproj", "ExpenseTracker.Api/"]

RUN dotnet restore "ExpenseTracker.Api/ExpenseTracker.Api.csproj"

# Copy source code and build
COPY src/ .
WORKDIR "/src/ExpenseTracker.Api"
RUN dotnet publish "ExpenseTracker.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ExpenseTracker.Api.dll"]
