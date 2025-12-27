import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../../database.json');

class KYCService {
  async readDatabase() {
    try {
      const data = await fs.readFile(DB_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      console.error('Error reading database:', err);
      return { users: [], trades: [] };
    }
  }

  async writeDatabase(data) {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Error writing database:', err);
      throw err;
    }
  }

  async submitKYC(userId, documents) {
    // Simulate AI verification with 3-second delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const db = await this.readDatabase();
    const userIndex = db.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Update user KYC status to verified
    db.users[userIndex].kycStatus = 'verified';
    db.users[userIndex].kycVerifiedAt = new Date().toISOString();
    db.users[userIndex].kycDocuments = {
      idDocument: documents.idDocument || 'uploaded',
      selfie: documents.selfie || 'uploaded'
    };

    await this.writeDatabase(db);

    return {
      success: true,
      message: 'KYC verification successful! You can now trade.',
      user: db.users[userIndex]
    };
  }

  async getKYCStatus(userId) {
    const db = await this.readDatabase();
    const user = db.users.find(u => u.id === userId);

    if (!user) {
      throw new Error('User not found');
    }

    return {
      kycStatus: user.kycStatus,
      kycVerifiedAt: user.kycVerifiedAt || null
    };
  }
}

export default new KYCService();
