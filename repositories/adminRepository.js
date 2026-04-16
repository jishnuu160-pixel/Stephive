import Admin from '../models/adminModel.js';

class AdminRepository {
    async findAdminByEmail(email) {
        return await Admin.findOne({ email: email });
    }
}

export default new AdminRepository();