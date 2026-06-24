import axios from 'axios';

const testApi = async () => {
  try {
    const loginRes = await axios.post('https://amlos-backend.onrender.com/api/auth/login', {
      email: 'admin@amlos.com',
      password: 'Admin@12345'
    });
    
    const token = loginRes.data.data.tokens.access;
    
    // Test 1: Empty search query / just standard list
    console.log("--- Test 1: Standard List (No Params) ---");
    try {
      const res1 = await axios.get('https://amlos-backend.onrender.com/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("List success! Count:", res1.data?.data?.count, "Results length:", res1.data?.data?.results?.length);
    } catch (e: any) {
      console.log("List failed:", e.response?.status, e.response?.data);
    }

    // Test 2: Role filter query param
    console.log("--- Test 2: Filtering by role ---");
    try {
      const res2 = await axios.get('https://amlos-backend.onrender.com/api/auth/users?role=ADMIN', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Role filter success! Count:", res2.data?.data?.count, "Results length:", res2.data?.data?.results?.length);
      if (res2.data?.data?.results?.length > 0) {
        console.log("Sample user roles:", res2.data.data.results.map((u: any) => u.role));
      }
    } catch (e: any) {
      console.log("Role filter failed:", e.response?.status, e.response?.data);
    }

    // Test 3: Pagination with page param
    console.log("--- Test 3: Pagination page=2 ---");
    try {
      const res3 = await axios.get('https://amlos-backend.onrender.com/api/auth/users?page=2', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Pagination success! Page 2 count:", res3.data?.data?.results?.length);
    } catch (e: any) {
      console.log("Pagination failed:", e.response?.status, e.response?.data);
    }

  } catch (error: any) {
    console.error("Error details:", error.response?.data || error.message);
  }
};

testApi();




