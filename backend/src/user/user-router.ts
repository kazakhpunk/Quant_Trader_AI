import { Router } from 'express';
import UserController from './user-controller';
import UserService from './user-service';

//in order to provide our frontend with the user data, we need to specify user routes

const userRouter = Router();

const userService = new UserService();
const userController = new UserController(userService);

userRouter.get('/users/', userController.getUsers);
userRouter.post('/users/', userController.createUser);
userRouter.get('/users/:id', userController.getUserById);

export default userRouter;
