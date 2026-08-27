/** @type {import('next').NextConfig} */

// PUNTO DE CONEXION EXTERNA: Polygon Amoy RPC + Server-side Wallet + Smart Contract
// Requiere: NEXT_PUBLIC_POLYGON_RPC_URL, SERVER_PRIVATE_KEY, NEXT_PUBLIC_CONTRACT_ADDRESS
// Configurar en: Vercel Dashboard > Environment Variables
// Accion pendiente: (1) Crear cuenta Alchemy/Infura > obtener RPC_URL
//   (2) Generar wallet server-side: npx hardhat run scripts/generate-wallet.ts
//   (3) Fondear con faucet MATIC Amoy: https://faucet.polygon.technology/
//   (4) Desplegar contrato: npx hardhat run scripts/deploy.ts --network polygonAmoy
//   (5) Copiar CONTRACT_ADDRESS del deploy output

const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
