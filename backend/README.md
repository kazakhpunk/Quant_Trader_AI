# 🚀 Node.js TypeScript Boilerplate

This is a boilerplate project for building Node.js applications using TypeScript. It includes a basic setup for Express.js, custom logging middleware, and route management.

## 📦 How to Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

   or

   ```bash
   yarn install
   ```

2. **Start the development server:**
   ```bash
   npm run start:dev
   ```
   or
   ```bash
   yarn start:dev
   ```

### 📂 Explanation of Structure

- **`src/`**: Source code directory.
  - **`user/`**: Directory for user-related modules and components.
    - **`dtos/`**: Directory for Data Transfer Objects (DTOs).
      - **`CreateUser.dto.ts`**: DTO for user creation.
    - **`types/`**: Directory for TypeScript types.
      - **`response.ts`**: Type definitions for API responses.
      - **`user-controller.ts`**: Type definitions for user controller.
      - **`user-router.ts`**: Type definitions for user router.
      - **`user-service.ts`**: Type definitions for user service.
  - **`global-router.ts`**: File for global route definitions.
  - **`index.ts`**: Main entry point of the application.
  - **`logger.ts`**: Custom logging middleware.

## 📝 Additional Information

This setup provides a structured way to build a Node.js application using TypeScript, with clear separation of concerns and organized testing. It includes everything you need to get started quickly and scale your application efficiently.

Feel free to customize the structure and add more features as per your requirements. Happy coding! 💻
