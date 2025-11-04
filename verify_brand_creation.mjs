
import fetch from 'node-fetch';
import * as jose from 'jose';

const BASE_URL = 'http://localhost:3002';
const NEXTAUTH_SECRET = "TqrMr0k7sgY6xDQFqmJKd24ntcwJXyxaRvYRD0I+IrE=";

async function getTestUser() {
  const res = await fetch(`${BASE_URL}/api/test/user`);
  const data = await res.json();
  if (!data.success) {
    throw new Error('Failed to get test user');
  }
  return data.user;
}

async function createJwt(user) {
    const secret = new TextEncoder().encode(NEXTAUTH_SECRET);
    const token = await new jose.SignJWT({
        "name": user.name,
        "email": user.email,
        "picture": user.image,
        "sub": user.id
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret);
    return token;
}

async function createBrand(token) {
  const res = await fetch(`${BASE_URL}/api/brands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Test Brand',
      description: 'This is a test brand.',
    }),
  });
  return res.json();
}

async function main() {
  try {
    console.log('Getting test user...');
    const user = await getTestUser();
    console.log('Test user:', user);

    console.log('Creating JWT...');
    const token = await createJwt(user);
    console.log('JWT:', token);

    console.log('Creating brand...');
    const brandData = await createBrand(token);
    console.log('Brand creation response:', brandData);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
