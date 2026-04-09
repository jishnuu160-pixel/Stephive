import * as userRepo from '../repositories/userRepository.js';

export const signup = async (data) => {
    const existingUser = await userRepo.findByEmail(data.email);

    if (existingUser) {
        throw new Error('User already exists');
    }

    return await userRepo.createUser(data);
};

export const login = async (data) => {
    const user = await userRepo.findByEmail(data.email);

    if (!user) {
        throw new Error("User does not exist");
    }

    if (user.password !== data.password) {
        throw new Error("Incorrect password");
    }

    return user;
};