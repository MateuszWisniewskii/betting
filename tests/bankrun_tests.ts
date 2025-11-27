import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Betting } from "../target/types/betting";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { AccountInfo, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Clock } from "solana-bankrun";

const IDL = require("../target/idl/betting.json");

// funkcje ułatwiające manipulacje czasem
async function setClock(context: any, newTimestamp: number | bigint) {
  const client = context.banksClient;
  const oldClock = await client.getClock();

  const newClock = new Clock(
    oldClock.slot,
    oldClock.epochStartTimestamp,
    oldClock.epoch,
    oldClock.leaderScheduleEpoch,
    BigInt(newTimestamp), //tuż przed zakończeniem głosowania: 1700009999 , równo zakończenie możliwości głosowania: 1700010000
  );

  context.setClock(newClock);
  return newClock;
}

// funkcja do wyświetlania aktualnego czasu
function logClock(clock: Clock) {
  console.log("---------------------------");
  console.log("Aktualny czas w symulacji (Unix Timestamp):", clock.unixTimestamp);
  console.log("Aktualny czas w symulacji:", new Date(Number(clock.unixTimestamp) * 1000).toLocaleString());
  console.log("---------------------------");
}

// funkcja do wyświetlania danego PDA oraz seedów
function logPda(name: string, pda: PublicKey, seeds: (Buffer | Uint8Array | string)[]) {
  console.log("---------------------------");
  console.log(`${name} PDA: ${pda.toBase58()}`);
  console.log("Seeds:");
  seeds.forEach((s, i) => {
    if (typeof s === "string") {
      console.log(`  [${i}]: "${s}"`);
    } else if (s instanceof Buffer || s instanceof Uint8Array) {
      console.log(`  [${i}]:`, Buffer.from(s).toString("hex"));
    } else {
      console.log(`  [${i}]:`, s);
    }
  });
  console.log("---------------------------");
}

// funkcja do wyświetlania balancu danego konta
async function printBalance(context: any, name: string, publicKey: PublicKey) {
  const balance = await context.banksClient.getBalance(publicKey);

  console.log("---------------------------");
  console.log(`${name} publicKey: ${publicKey.toBase58()}`);
  console.log(`${name} lamports: ${balance}`);
  console.log(`${name} SOL: ${Number(balance) / 1_000_000_000}`);
  console.log("---------------------------");
}

// funkcja do konwersji kwoty w SOL na lamporty
function solToLamports(solAmount: number) {
  return solAmount * anchor.web3.LAMPORTS_PER_SOL;
}

describe("Test sprawdzający dodawanie opcji po rozpoczęciu obstawiania", () => {
  // zmienne globalne dla testu

  // niezbędne zmienne do działania bankrun
  let context;
  let provider;
  let puppetProgram;

  // zmienne wymagane do manipulacji czasem
  let client;
  let currentClock;

  // zmienne do utwworzenia kontraktu
  let eventId = 1;
  let bettingStart = 1700000000; // Unix Timestamp. Tue Nov 14 2023 23:13:20 GMT+0100 (czas środkowoeuropejski standardowy)
  let bettingEnd = 1700010000; // Wed Nov 15 2023 02:00:00 GMT+0100 (czas środkowoeuropejski standardowy)
  let eventName = "Nazwa testowego wydarzenia";
  let eventDescription = "Opis testowego wydarzenia";
  let nameTeamA = "Team A";
  let nameTeamB = "Team B";
  let nameTeamC = "Team C";

  // konta użytkowników
  let authority; // admin bądź jednostka odpowiedzialna za tworzenie i zarządzanie wydarzeniem 
  let userA; // zwykły użytkownik kontraktu, który bierze udział w obstawianiu
  let userB;
  let userC;

  // seedy dla adresów pochodnych programu
  let eventSeeds;
  let vaultSeeds;
  let teamASeeds;
  let teamBSeeds;
  let teamCSeeds;
  let userABetSeeds;
  let userBBetSeeds;
  let userCBetSeeds;

  // adresy pochodne programu
  let eventPda;
  let vaultPda;
  let teamAPda;
  let teamBPda;
  let teamCPda;
  let userABetPda;
  let userBBetPda;
  let userCBetPda;

  before("Initialization", async () => {

    // Generowanie kluczy
    authority = Keypair.generate();
    userA = Keypair.generate();
    userB = Keypair.generate();
    userC = Keypair.generate();

    // zasilanie kont użytkowinków
    const accounts = [authority, userA, userB, userC].map(user => ({
      address: user.publicKey,
      info: {
        lamports: solToLamports(9), // każdy użytkownik dostaje 9 SOL
        data: Buffer.alloc(0), // puste konto
        owner: SystemProgram.programId,
        executable: false, // zaznaczenie że to konto nie jest programem
        rentEpoch: 0,
      } as AccountInfo<Buffer>
    }));
    accounts.forEach(acc => {
      console.log("Address:", acc.address.toBase58());
      console.log("Lamports:", acc.info.lamports);
      console.log("Owner:", acc.info.owner.toBase58());
      console.log("Executable:", acc.info.executable);
      console.log("Rent epoch:", acc.info.rentEpoch);
      console.log("---------------------------");
    });

    // inicjalizacja środowiska testowego
    context = await startAnchor("../betting", [], accounts);
    provider = new BankrunProvider(context);
    puppetProgram = new Program<Betting>(IDL, provider);

    // inicjalizacja seedów dla adresów pochodnych programu
    eventSeeds = [
      Buffer.from("event_seed"),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
    ];

    vaultSeeds = [
      Buffer.from("vault"),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
    ];

    teamASeeds = [
      Buffer.from("option_seed"),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
      Buffer.from("Team A"),
    ];

    teamBSeeds = [
      Buffer.from("option_seed"),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
      Buffer.from("Team B"),
    ];

    teamCSeeds = [
      Buffer.from("option_seed"),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
      Buffer.from("Team C"),
    ];

    userABetSeeds = [
      Buffer.from("bet"),
      userA.publicKey.toBytes(),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
    ];

    userBBetSeeds = [
      Buffer.from("bet"),
      userB.publicKey.toBytes(),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
    ];

    userCBetSeeds = [
      Buffer.from("bet"),
      userC.publicKey.toBytes(),
      new BN(eventId).toArrayLike(Buffer, "le", 8),
    ];

    // inicjalizacja adresów pochodnych programu (PDA)
    [eventPda] = PublicKey.findProgramAddressSync(
      eventSeeds,
      puppetProgram.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      vaultSeeds,
      puppetProgram.programId
    );

    [teamAPda] = PublicKey.findProgramAddressSync(
      teamASeeds,
      puppetProgram.programId
    );

    [teamBPda] = PublicKey.findProgramAddressSync(
      teamBSeeds,
      puppetProgram.programId
    );

    [teamCPda] = PublicKey.findProgramAddressSync(
      teamCSeeds,
      puppetProgram.programId
    );

    [userABetPda] = PublicKey.findProgramAddressSync(
      userABetSeeds,
      puppetProgram.programId
    );

    [userBBetPda] = PublicKey.findProgramAddressSync(
      userBBetSeeds,
      puppetProgram.programId
    );

    [userCBetPda] = PublicKey.findProgramAddressSync(
      userCBetSeeds,
      puppetProgram.programId
    );

    // inicjalizacja zegara
    client = context.banksClient;
    currentClock = await client.getClock();

    // Kontrolne wypisanie po inicjalizacji 
    logClock(currentClock);

    await printBalance(context, "authority", authority.publicKey);
    await printBalance(context, "userA", userA.publicKey);
    await printBalance(context, "userB", userB.publicKey);
    await printBalance(context, "userC", userC.publicKey);

    logPda("Event", eventPda, eventSeeds);
    logPda("Vault", vaultPda, vaultSeeds);
    logPda("Team A", teamAPda, teamASeeds);
    logPda("Team B", teamBPda, teamBSeeds);
    logPda("Team C", teamCPda, teamCSeeds);
    logPda("UserA Bet", userABetPda, userABetSeeds);
    logPda("UserB Bet", userBBetPda, userBBetSeeds);
    logPda("UserC Bet", userCBetPda, userCBetSeeds);

  });

  it("Tworzenie wydarzenia", async () => {
    // ustawienie czasu, w którym tworzone jest wydarzenie i wypisanie go
    currentClock = await setClock(context, bettingStart - 100);
    logClock(currentClock);

    await puppetProgram.methods.initializeEvent(
      new BN(eventId),
      new BN(bettingStart),
      new BN(bettingEnd),
      eventName,
      eventDescription,
    ).accounts({
      authority: authority.publicKey,
      eventAccount: eventPda,
      vaultAccount: vaultPda,
      systemProgram: SystemProgram.programId
    }).signers([authority]).rpc();
  });

  it("Dodawanie drużyn do wydarzenia", async () => {
    await puppetProgram.methods.initializeOptions(
      new BN(eventId),
      nameTeamA,
    ).accounts({
      authority: authority.publicKey,
      optionAccount: teamAPda,
      eventAccount: eventPda,
      systemProgram: SystemProgram.programId,
    }).signers([authority]).rpc();

    await puppetProgram.methods.initializeOptions(
      new BN(eventId),
      nameTeamB,
    ).accounts({
      authority: authority.publicKey,
      optionAccount: teamBPda,
      eventAccount: eventPda,
      systemProgram: SystemProgram.programId,
    }).signers([authority]).rpc();
  });


  it("Obstawianie przed otwarciem głosowania", async () => {
    currentClock = setClock(context, bettingStart - 50);
    logClock(currentClock);

    const betAmount = new BN(solToLamports(0.25));

    try {
      // Obstawianie
      const vote0Tx = await puppetProgram.methods.placeBet(
        new BN(eventId),
        nameTeamA,
        betAmount,
      ).accounts({
        player: userA.publicKey,
        eventAccount: eventPda,
        optionAccount: teamAPda,
        vaultAccount: vaultPda,
        betAccount: userABetPda,
        systemProgram: SystemProgram.programId,
      }).signers([userA]).rpc();

      // Jeśli operacja się powiedzie, rzucamy błąd, żeby test upadł
      throw new Error("Operacja NIE powinna się powieść przed rozpoczęciem obstawiania!");
    } catch (error) {
      // Weryfikujemy, czy to jest nasz oczekiwany błąd z programu Rust
      const expectedErrorMessage = "BettingNotStarted"; // Nazwa błędu z Rust

      if (error.error && error.error.errorCode && error.error.errorCode.code === expectedErrorMessage) {
        console.log(`Test udany. Oczekiwany błąd przechwycony: ${expectedErrorMessage}`);
      } else {
        // Jeśli błąd jest inny niż oczekiwano, rzucamy go dalej, a test upada
        console.log("Test nieudany. Przechwycono nieoczekiwany błąd:");
        throw error;
      }
    }
  });

  it("Dodawanie dryżyn do wydarzenia po rozpoczęciu obstawiania (powinno się NIE udać)", async () => {
    // ustawienie czasu po rozpoczęciu zakładów
    currentClock = await setClock(context, bettingStart + 10);
    logClock(currentClock);

    try {
      await puppetProgram.methods.initializeOptions(
        new BN(eventId),
        nameTeamC,
      ).accounts({
        authority: authority.publicKey,
        optionAccount: teamCPda,
        eventAccount: eventPda,
        systemProgram: SystemProgram.programId,
      }).signers([authority]).rpc();

      // Jeśli operacja się powiedzie, rzucamy błąd, żeby test upadł
      throw new Error("Operacja NIE powinna się powieść po rozpoczęciu obstawiania!");
    } catch (error) {
      // Weryfikujemy, czy to jest nasz oczekiwany błąd z programu Rust
      const expectedErrorMessage = "AddingOptionsAfterBettingStart"; // Nazwa błędu z Rust

      if (error.error && error.error.errorCode && error.error.errorCode.code === expectedErrorMessage) {
        console.log(`Test udany. Oczekiwany błąd przechwycony: ${expectedErrorMessage}`);
      } else {
        // Jeśli błąd jest inny niż oczekiwano, rzucamy go dalej, a test upada
        console.log("Test nieudany. Przechwycono nieoczekiwany błąd:");
        throw error;
      }
    }
  });

  it("Standardowe obstawianie", async () => {
    // ustawienie czasu na chwilę po rozpoczęciu możliwości obstawiania
    currentClock = await client.getClock();
    setClock(context, bettingStart + 50);
    logClock(currentClock);

    const betAmount = new BN(solToLamports(0.25));

    // Obstawianie
    const vote1Tx = await puppetProgram.methods.placeBet(
      new BN(eventId),
      nameTeamA,
      betAmount,
    ).accounts({
      player: userA.publicKey,
      eventAccount: eventPda,
      optionAccount: teamAPda,
      vaultAccount: vaultPda,
      betAccount: userABetPda,
      systemProgram: SystemProgram.programId,
    }).signers([userA]).rpc();

    const vote2Tx = await puppetProgram.methods.placeBet(
      new BN(eventId),
      nameTeamA,
      betAmount,
    ).accounts({
      player: userB.publicKey,
      eventAccount: eventPda,
      optionAccount: teamAPda,
      vaultAccount: vaultPda,
      betAccount: userBBetPda,
      systemProgram: SystemProgram.programId,
    }).signers([userB]).rpc();

    const vote3Tx = await puppetProgram.methods.placeBet(
      new BN(eventId),
      nameTeamB,
      betAmount,
    ).accounts({
      player: userC.publicKey,
      eventAccount: eventPda,
      optionAccount: teamBPda,
      vaultAccount: vaultPda,
      betAccount: userCBetPda,
      systemProgram: SystemProgram.programId,
    }).signers([userC]).rpc();
  });

  it("Kończenie wydarzenia", async () => {
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(bettingEnd + 100), //tuż przed zakończeniem głosowania: 1700009999 , równo zakończenie możliwości głosowania: 1700010000
      ),
    );
    currentClock = await client.getClock();
    console.log("Aktualny czas: ", currentClock.unixTimestamp);

    await puppetProgram.methods.resolveEvent(
      new BN(eventId),
      nameTeamA,
    ).accounts({
      authority: authority.publicKey,
      eventAccount: eventPda,
      systemProgram: SystemProgram.programId,
    }).signers([authority]).rpc();
  });

  it("Odbieranie nagród", async () => {
    await puppetProgram.methods.claimReward(
      new BN(eventId),
    ).accounts({
      player: userA.publicKey,
      vaultAccount: vaultPda,
      betAccount: userABetPda,
      eventAccount: eventPda,
      optionAccount: teamAPda,
      systemProgram: SystemProgram.programId,
    }).signers([userA]).rpc();

    await puppetProgram.methods.claimReward(
      new BN(eventId),
    ).accounts({
      player: userB.publicKey,
      vaultAccount: vaultPda,
      betAccount: userBBetPda,
      eventAccount: eventPda,
      optionAccount: teamAPda,
      systemProgram: SystemProgram.programId,
    }).signers([userB]).rpc();

    await puppetProgram.methods.claimReward(
      new BN(eventId),
    ).accounts({
      player: userC.publicKey,
      vaultAccount: vaultPda,
      betAccount: userCBetPda,
      eventAccount: eventPda,
      optionAccount: teamBPda,
      systemProgram: SystemProgram.programId,
    }).signers([userC]).rpc();
  });
});

