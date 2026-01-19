// npx ts-node scripts/scenariusz_zakladow.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Betting } from "../target/types/betting";
import * as fs from "fs";

// Funkcja pomocnicza do czekania (sleep)
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Funkcja pomocnicza do obsługi błędów (zamiast assert/expect z Mocha)
async function expectFailure(promise: Promise<any>, description: string) {
  try {
    await promise;
    console.error(`BŁĄD: Test "${description}" powinien się nie udać, a przeszedł!`);
  } catch (err: any) {
    // Sprawdzamy czy to błąd z programu (często zawiera kod błędu lub logi)
    console.log(`SUKCES: Test "${description}" prawidłowo rzucił błąd.`);
    // Opcjonalnie: console.log("Komunikat błędu:", err.message);
  }
}

async function main() {
  // --- KONFIGURACJA ---
  const connection = new anchor.web3.Connection("http://127.0.0.1:8899", "confirmed");

  const walletPath = "/home/mateusz/.config/solana/id.json"; 
  const walletKeypair = anchor.web3.Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);

  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = anchor.workspace.Betting as Program<Betting>;

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

  // 1. OBLICZANIE PDA
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
  await program.methods
    .initializeEvent(eventId, startTime, endTime, eventName, eventDesc)
    .accounts({
      authority: provider.wallet.publicKey,
      eventAccount: eventPda,
      vaultAccount: vaultPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .rpc();
  console.log("Wydarzenie utworzone.");

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

  // --- OCZEKIWANIE NA START ---
  console.log("\nCzekam 6 sekund na start...");
  await wait(6000);

  // --- KROK 3: Obstawianie ---
  const player = anchor.web3.Keypair.generate();
  // Zasilamy gracza SOL
  const airdropSig = await connection.requestAirdrop(player.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig);
  
  const betAmount = new anchor.BN(1_000_000_000); // 1 SOL

  const [betPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bet"), player.publicKey.toBuffer(), eventIdBuffer],
    program.programId
  );

  // === TEST NEGATYWNY: Obstawianie na nieistniejącą drużynę ===
  console.log("\n[TEST] Próba obstawienia na 'FakeTeam'...");
  const fakeOption = "FakeTeam";
  const [fakeOptionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("option_seed"), eventIdBuffer, Buffer.from(fakeOption)],
    program.programId
  );

  await expectFailure(
    program.methods
    .placeBet(eventId, fakeOption, betAmount)
    .accounts({
      player: player.publicKey,
      eventAccount: eventPda,
      optionAccount: fakeOptionPda, // To konto nie istnieje
      vaultAccount: vaultPda,
      betAccount: betPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .signers([player]) 
    .rpc(),
    "Obstawianie na nieistniejącą drużynę"
  );

  // === POPRAWNE OBSTAWIANIE ===
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

  // --- OCZEKIWANIE NA KONIEC ---
  console.log("\nCzekam 10 sekund na koniec meczu...");
  await wait(10000); 
  // Teraz czas > endTime

  // === TEST NEGATYWNY: Obstawianie po czasie ===
  console.log("\n[TEST] Próba obstawienia po zakończeniu czasu...");
  // Generujemy nowe konto zakładu dla gracza (zeby nie padło przez 'account already initialized')
  // albo po prostu używamy innego gracza/seed'u. Tutaj dla uproszczenia użyjemy tego samego gracza,
  // co w przypadku failure zwróci błąd logiczny "AlreadyInitialized" LUB "BettingEnded".
  // Żeby mieć pewność, że testujemy czas, użyjmy 'playerB'.
  
  const playerB = anchor.web3.Keypair.generate();
  await connection.confirmTransaction(await connection.requestAirdrop(playerB.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL));
  const [betBPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), playerB.publicKey.toBuffer(), eventIdBuffer], program.programId
  );

  await expectFailure(
    program.methods.placeBet(eventId, optionA, betAmount)
    .accounts({
        player: playerB.publicKey,
        eventAccount: eventPda,
        optionAccount: optionAPda,
        vaultAccount: vaultPda,
        betAccount: betBPda,
        systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .signers([playerB])
    .rpc(),
    "Obstawianie po czasie"
  );

  // === TEST NEGATYWNY: Haker próbuje rozwiązać wydarzenie ===
  console.log("\n[TEST] Próba rozwiązania przez osobę nieuprawnioną (Haker)...");
  const hacker = anchor.web3.Keypair.generate();
  await connection.confirmTransaction(await connection.requestAirdrop(hacker.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL));

  await expectFailure(
    program.methods.resolveEvent(eventId, optionA)
    .accounts({
        authority: hacker.publicKey, // Haker jako authority
        eventAccount: eventPda,
        vaultAccount: vaultPda,
        optionAccount: optionAPda,
        systemProgram: anchor.web3.SystemProgram.programId,
    } as any)
    .signers([hacker]) // Haker podpisuje
    .rpc(),
    "Haker rozwiązuje wydarzenie"
  );

  // --- KROK 4: Rozwiązanie (Poprawne) ---
  console.log(`\n4. Rozstrzygnięcie (Wygrywa ${optionA})...`);
  const txResolve = await program.methods
    .resolveEvent(eventId, optionA)
    .accounts({
      authority: provider.wallet.publicKey, // Prawdziwy admin
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

  // === TEST NEGATYWNY: Double Claim ===
  console.log("\n[TEST] Próba ponownego odebrania nagrody (Double Claim)...");
  await expectFailure(
    program.methods.claimReward(eventId)
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
    .rpc(),
    "Podwójna wypłata nagrody"
  );

  console.log("\n--- KONIEC SCENARIUSZA ---");
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});