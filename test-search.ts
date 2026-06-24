import axios from 'axios';

const testApi = async () => {
  try {
    const loginRes = await axios.post('https://amlos-backend.onrender.com/api/auth/login', {
      email: 'admin@amlos.com',
      password: 'Admin@12345'
    });
    
    const token = loginRes.data.data.tokens.access;
    
    const searchRes = await axios.get('https://amlos-backend.onrender.com/api/auth/users?search=admin', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(JSON.stringify(searchRes.data, null, 2));
  } catch (error: any) {
    console.error("Error details:", error.response?.data || error.message);
  }
};

testApi();



