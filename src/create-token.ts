import {
    createFungible,
    mplTokenMetadata,
    revokeStandardV1,
    TokenStandard
  } from '@metaplex-foundation/mpl-token-metadata'
  import {
    createTokenIfMissing,
    findAssociatedTokenPda,
    getSplAssociatedTokenProgramId,
    mintTokensTo,
  } from '@metaplex-foundation/mpl-toolbox'
  import {
    generateSigner,
    percentAmount,
    createGenericFile,
    signerIdentity,
    sol,
    keypairIdentity,
    createSignerFromKeypair
  } from '@metaplex-foundation/umi'
  import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
  import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'
  import { base58 } from '@metaplex-foundation/umi/serializers'
  import { TOKEN_PROGRAM_ID, setAuthority, AuthorityType, createSetAuthorityInstruction } from '@solana/spl-token'
  import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
  import fetch from 'node-fetch'
  import fs from 'fs'
  import path from 'path'
  
  const createAndMintTokens = async () => {
    const umi = createUmi("https://devnet.helius-rpc.com/?api-key=e3996982-5073-4b8b-942d-1d774b777012")
      .use(mplTokenMetadata())
      .use(irysUploader())

      // Convert your walletFile onto a keypair.
    const walletFile = JSON.parse(fs.readFileSync('./bosYRnpXtejtDXF79Pj4MnTPfHaZiJEFGSs1PsbkXne.json', 'utf8'));
    let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletFile));
      // Load the keypair into umi.
    umi.use(keypairIdentity(keypair));
      
    // Create web3.js connection and keypair for SPL token operations
    const connection = new Connection('https://devnet.helius-rpc.com/?api-key=e3996982-5073-4b8b-942d-1d774b777012', 'confirmed');
    const web3Keypair = Keypair.fromSecretKey(new Uint8Array(walletFile));
  
    // Fetch metadata from remote URL
    const metadataUrl = "https://raw.githubusercontent.com/cameronspaul/create-solana-token/refs/heads/main/metadata-data.json";
    console.log("Fetching metadata from:", metadataUrl);
    const response = await fetch(metadataUrl);
    if (!response.ok) throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    const metadata = await response.json();
  
    // Use the remote metadata URI directly
    const metadataUri = metadataUrl;
  
    // Creating the mintIx
    const mintSigner = generateSigner(umi);
    const createFungibleIx = createFungible(umi, {
      mint: mintSigner,
      name: metadata.name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: 9, // set the amount of decimals you want your token to have.
      symbol: metadata.symbol,
    });
  
    const createTokenIx = createTokenIfMissing(umi, {
      mint: mintSigner.publicKey,
      owner: umi.identity.publicKey,
      ataProgram: getSplAssociatedTokenProgramId(umi),
    });
  
    const mintTokensIx = mintTokensTo(umi, {
      mint: mintSigner.publicKey,
      token: findAssociatedTokenPda(umi, {
        mint: mintSigner.publicKey,
        owner: umi.identity.publicKey,
      }),
      amount: BigInt(1000000000000000000),
    });

    console.log("Sending transaction")
    const tx = await createFungibleIx
      .add(createTokenIx)
      .add(mintTokensIx)
      .sendAndConfirm(umi);
  
    const signature = base58.deserialize(tx.signature)[0];
    console.log('\nTransaction Complete')
    console.log('View Transaction on Solana Explorer')
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    console.log('View Token on Solana Explorer')
    console.log(`https://explorer.solana.com/address/${mintSigner.publicKey}?cluster=devnet`)
  
    // Convert mintSigner publicKey to Solana PublicKey
    const mintPublicKey = new PublicKey(mintSigner.publicKey);
  
    try {
        // Create a single transaction for both authority changes
        const transaction = new Transaction();

        // Add instruction to revoke mint authority
        transaction.add(
            createSetAuthorityInstruction(
                mintPublicKey,
                web3Keypair.publicKey,
                AuthorityType.MintTokens,
                null
            )
        );

        // Add instruction to revoke freeze authority
        transaction.add(
            createSetAuthorityInstruction(
                mintPublicKey,
                web3Keypair.publicKey,
                AuthorityType.FreezeAccount,
                null
            )
        );

        // Send and confirm the single transaction
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [web3Keypair]
        );
        
        console.log('Mint and Freeze authorities successfully revoked in a single transaction.');
        console.log(`Transaction signature: ${signature}`);
    } catch (error) {
        console.error('Error revoking authorities:', error);
    }
  };
  
  createAndMintTokens()