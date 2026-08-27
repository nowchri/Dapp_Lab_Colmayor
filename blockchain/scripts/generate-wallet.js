/**
 * Script: generate-wallet.js
 *
 * Propósito: Generar wallet server-side para firma de transacciones.
 * CERO DEPENDENCIAS EXTERNAS — usa solo crypto nativo de Node.js.
 *
 * Uso: node scripts/generate-wallet.js
 *
 * PUNTO DE CONEXION: Server-side Wallet (E3)
 *   Output: Address + Private Key
 *   Acción: Pegar private key en frontend/.env → SERVER_PRIVATE_KEY
 *           Fondear en https://faucet.polygon.technology/ (Amoy)
 */

const crypto = require("crypto");

// ethers.Wallet.createRandom() internamente hace esto:
// 1. Genera 32 bytes aleatorios (private key)
// 2. Deriva la address pública via secp256k1
// Como no tenemos ethers instalado, generamos lo que podemos
// y documentamos cómo computar la address.

const privateKeyBytes = crypto.randomBytes(32);
const privateKey = "0x" + privateKeyBytes.toString("hex");

console.log("=".repeat(60));
console.log("  GENERADOR DE WALLET SERVER-SIDE");
console.log("  DApp Laboratorio IUCMC");
console.log("=".repeat(60));
console.log();
console.log("PRIVATE KEY GENERADA:");
console.log();
console.log("  " + privateKey);
console.log();
console.log("ADVERTENCIA:");
console.log("  La address pública NO se puede derivar sin ethers.js instalado.");
console.log("  Opciones para obtener la address:");
console.log();
console.log("  OPCIÓN A (recomendada):");
console.log("    Después de npm install, ejecuta la versión TypeScript:");
console.log("    npx ts-node scripts/generate-wallet.ts");
console.log();
console.log("  OPCIÓN B (manual):");
console.log("  1. Instala ethers global: npm i -g ethers");
console.log("  2. Ejecuta en Node REPL:");
console.log("     > const { Wallet } = require('ethers');");
console.log("     > const w = new Wallet('" + privateKey + "');");
console.log("     > console.log('Address:', w.address);");
console.log();
console.log("PASOS DESPUÉS:");
console.log("  1. Pega la PRIVATE KEY en:");
console.log("     blockchain/.env → SERVER_PRIVATE_KEY=" + privateKey);
console.log("     frontend/.env → SERVER_PRIVATE_KEY=" + privateKey);
console.log("  2. Pega la ADDRESS en:");
console.log("     blockchain/.env → SERVER_WALLET_ADDRESS=<address>");
console.log("     frontend/.env → SERVER_WALLET_ADDRESS=<address>");
console.log("  3. Fondear en https://faucet.polygon.technology/ (Amoy)");
console.log("=".repeat(60));
