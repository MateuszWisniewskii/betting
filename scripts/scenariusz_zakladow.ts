import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Betting } from "../target/types/betting";
import * as fs from "fs"; // <--- NOWY IMPORT

// Funkcja pomocnicza do czekania (sleep)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  // --- ZMIANA KONFIGURACJI PROVIDERA ---
  
  // 1. Ustawienie połączenia do lokalnego klastra
  const connection = new anchor.web3.Connection("http://127.0.0.1:8899", "confirmed");

  // 2. Wczytanie portfela z pliku (id.json)
  // UWAGA: Sprawdź, czy ta ścieżka jest poprawna dla Twojego systemu!
  // Zazwyczaj jest to: /home/NAZWA_UZYTKOWNIKA/.config/solana/id.json
  const walletPath = "/home/mateusz/.config/solana/id.json";
  
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    Buffer.from(
      JSON.parse(fs.readFileSync(walletPath, "utf-8"))
    )
  );
  const wallet = new anchor.Wallet(walletKeypair);

  // 3. Utworzenie Providera ręcznie
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  
  // Ustawienie providera globalnie dla Anchora
  anchor.setProvider(provider);

  // --- KONIEC ZMIAN, DALEJ TO SAMO ---

  const program = anchor.workspace.Betting as Program<Betting>;
  // const connection = provider.connection; // To już mamy wyżej zdefiniowane

  const eventId = new anchor.BN(Math.floor(Math.random() * 1000000));
  
  const eventName = "Real vs Barca";
  const eventDesc = "El Clasico - Finał";
  const optionA = "Real Madrid";
  const optionB = "Barcelona";
  
  const now = Math.floor(Date.now() / 1000);
  const startTime = new anchor.BN(now + 5); 
  const endTime = new anchor.BN(now + 15);   

  console.log("--- ROZPOCZYNAMY SCENARIUSZ ---");
  console.log(`Event ID: ${eventId.toString()}`);

  // 1. OBLICZANIE PDA (RĘCZNIE)
  const eventIdBuffer = eventId.toArrayLike(Buffer, "le", 8);

  const [eventPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("event_seed"), eventIdBuffer],
    program.programId
  );

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), eventIdBuffer],
    program.programId
  );

  const [optionAPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("option_seed"), eventIdBuffer, Buffer.from(optionA)],
    program.programId
  );

  const [optionBPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("option_seed"), eventIdBuffer, Buffer.from(optionB)],
    program.programId
  );

  console.log("Adres wydarzenia (PDA):", eventPda.toString());

  // --- KROK 1: Inicjalizacja Wydarzenia ---
  console.log("\n1. Tworzenie wydarzenia...");
  
  const txInit = await program.methods
    .initializeEvent(eventId, startTime, endTime, eventName, eventDesc)
    // TU JEST ZMIANA: dodane "as any", żeby TypeScript nie krzyczał
    .accounts({
      authority: provider.wallet.publicKey,
      eventAccount: eventPda,
      vaultAccount: vaultPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();
  console.log("Wydarzenie utworzone. TX:", txInit);

  // --- KROK 2: Inicjalizacja Opcji ---
  console.log("\n2. Dodawanie opcji...");
  
  await program.methods
    .initializeOptions(eventId, optionA)
    .accounts({
      authority: provider.wallet.publicKey,
      optionAccount: optionAPda,
      eventAccount: eventPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();
  
  await program.methods
    .initializeOptions(eventId, optionB)
    .accounts({
      authority: provider.wallet.publicKey,
      optionAccount: optionBPda,
      eventAccount: eventPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();
  console.log("Opcje dodane.");

  // --- OCZEKIWANIE ---
  console.log("\nCzekam 6 sekund na start...");
  await wait(6000);

  // --- KROK 3: Obstawianie ---
  const player = anchor.web3.Keypair.generate();
  const airdropSig = await connection.requestAirdrop(player.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig);
  
  const betAmount = new anchor.BN(1_000_000_000); // 1 SOL

  const [betPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), player.publicKey.toBuffer(), eventIdBuffer],
    program.programId
  );

  console.log(`\n3. Gracz ${player.publicKey.toString()} stawia na ${optionA}...`);
  
  const txBet = await program.methods
    .placeBet(eventId, optionA, betAmount)
    .accounts({
      player: player.publicKey,
      eventAccount: eventPda,
      optionAccount: optionAPda,
      vaultAccount: vaultPda,
      betAccount: betPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .signers([player]) 
    .rpc();
  console.log("Zakład przyjęty. TX:", txBet);

  // --- OCZEKIWANIE ---
  console.log("\nCzekam 10 sekund na koniec meczu...");
  await wait(10000);

  // --- KROK 4: Rozwiązanie ---
  console.log(`\n4. Rozstrzygnięcie...`);
  const txResolve = await program.methods
    .resolveEvent(eventId, optionA)
    .accounts({
      authority: provider.wallet.publicKey,
      eventAccount: eventPda,
      vaultAccount: vaultPda,
      optionAccount: optionAPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();
  console.log("Wydarzenie rozstrzygnięte. TX:", txResolve);

  // --- KROK 5: Odbiór Nagrody ---
  console.log("\n5. Gracz odbiera nagrodę...");
  const txClaim = await program.methods
    .claimReward(eventId)
    .accounts({
      player: player.publicKey,
      authority: provider.wallet.publicKey,
      vaultAccount: vaultPda,
      betAccount: betPda,
      eventAccount: eventPda,
      optionAccount: optionAPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .signers([player])
    .rpc();

  console.log("Nagroda odebrana! TX:", txClaim);
  
  const balance = await connection.getBalance(player.publicKey);
  console.log(`Saldo gracza po wypłacie: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});