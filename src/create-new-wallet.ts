import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Generate a new keypair
const generateWallet = () => {
    const keypair = Keypair.generate();
    
    // Convert the secret key to an array
    const secretKey = Array.from(keypair.secretKey);
    
    // Create filename using the public key
    const filename = `${keypair.publicKey.toString()}.json`;
    
    // Save the secret key to a JSON file
    fs.writeFileSync(filename, JSON.stringify(secretKey));
    
    console.log('Wallet generated successfully!');
    console.log('Public Key:', keypair.publicKey.toString());
    console.log('Wallet saved to:', filename);
    
    // For security, remind user to keep secret key safe
    console.log('\nIMPORTANT: Keep your wallet file safe and never share it with anyone!');
};

// Run the wallet generation
generateWallet();