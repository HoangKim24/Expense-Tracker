# Base image for runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy all csproj files and restore dependencies
COPY ["src/ExpenseTracker.Api/ExpenseTracker.Api.csproj", "src/ExpenseTracker.Api/"]
COPY ["src/ExpenseTracker.Application/ExpenseTracker.Application.csproj", "src/ExpenseTracker.Application/"]
COPY ["src/ExpenseTracker.Domain/ExpenseTracker.Domain.csproj", "src/ExpenseTracker.Domain/"]
COPY ["src/ExpenseTracker.Infrastructure/ExpenseTracker.Infrastructure.csproj", "src/ExpenseTracker.Infrastructure/"]
RUN dotnet restore "src/ExpenseTracker.Api/ExpenseTracker.Api.csproj"

# Copy the remaining source code and build
COPY . .
WORKDIR "/src/src/ExpenseTracker.Api"
RUN dotnet build "ExpenseTracker.Api.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "ExpenseTracker.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final production stage
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ExpenseTracker.Api.dll"]
