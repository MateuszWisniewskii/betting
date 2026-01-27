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

describe("Testy", () => {
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
  //  logClock(currentClock);

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
     //   console.log(`Test udany. Oczekiwany błąd przechwycony: ${expectedErrorMessage}`);
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
   // logClock(currentClock);

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
     //   console.log(`Test udany. Oczekiwany błąd przechwycony: ${expectedErrorMessage}`);
      } else {
        // Jeśli błąd jest inny niż oczekiwano, rzucamy go dalej, a test upada
        console.log("Test nieudany. Przechwycono nieoczekiwany błąd:");
        throw error;
      }
    }
  });

  it("Próba obstawienia na nieistniejącą drużynę (powinno się NIE udać)", async () => {
    // 1. Przygotowanie fałszywych danych
    const fakeTeamName = "NieistniejacaDruzyna";
    const betAmount = new BN(solToLamports(0.1));

    // 2. Musimy wyliczyć adres (PDA) dla tej fałszywej drużyny.
    // Zakładam, że Twoje seedy to np. ["option", eventId, name].
    // Dostosuj ten fragment do swoich seedów w Rucie, jeśli są inne.
    const [fakeTeamPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("option"), // lub inny prefix, którego używasz w Rucie
        new BN(eventId).toArrayLike(Buffer, "le", 8),
        Buffer.from(fakeTeamName)
      ],
      puppetProgram.programId
    );

    try {
      // 3. Próba obstawienia
      await puppetProgram.methods.placeBet(
        new BN(eventId),
        fakeTeamName, // Podajemy błędną nazwę
        betAmount,
      ).accounts({
        player: userA.publicKey,
        eventAccount: eventPda,

        optionAccount: fakeTeamPda, // <--- To konto NIE ISTNIEJE (nie ma go na chainie)

        vaultAccount: vaultPda,
        betAccount: userABetPda, // Tu używamy istniejącego konta zakładu lub nowego, zależnie od logiki
        systemProgram: SystemProgram.programId,
      }).signers([userA]).rpc();

      // Jeśli przeszło - błąd testu
      throw new Error("KRYTYCZNY BŁĄD: Pozwolono obstawić na nieistniejącą opcję!");
    } catch (error) {
      // 4. Analiza błędu
      // Oczekujemy błędu, który mówi, że konto nie jest zainicjalizowane.
      // W Anchorze to zazwyczaj: "AccountNotInitialized" lub "The program expected this account to be already initialized"

      const errorString = JSON.stringify(error);
      const isAccountError = errorString.includes("AccountNotInitialized") ||
        error.message.includes("Account not initialized") ||
        error.message.includes("Account does not exist");

      if (isAccountError) {
     //   console.log("Test udany. System odrzucił zakład na nieistniejącą drużynę (brak konta Option).");
      } else {
        // Jeśli to inny błąd (np. brak środków), logujemy go
        console.log("Test nieudany. Przechwycono nieoczekiwany błąd:");
        throw error;
      }
    }
  });

  it("Standardowe obstawianie", async () => {
    // ustawienie czasu na chwilę po rozpoczęciu możliwości obstawiania
    currentClock = await client.getClock();
    setClock(context, bettingStart + 50);
 //   logClock(currentClock);

    const betAmount = new BN(solToLamports(0.25));
    const twiceOfBetAmount = new BN(solToLamports(0.5));

    // Obstawianie
    const vote1Tx = await puppetProgram.methods.placeBet(
      new BN(eventId),
      nameTeamA,
      twiceOfBetAmount,
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

  it("Próba rozwiązania wydarzenia przez osobę nieuprawnioną (powinno się NIE udać)", async () => {
  //  console.log("--- Testowanie Access Control dla resolveEvent ---");

    // 1. Upewniamy się, że czas jest poprawny do zakończenia (żeby test nie upadł przez zły czas)
    // Ustawiamy ten sam czas co w teście "Kończenie wydarzenia"
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(bettingEnd + 100),
      ),
    );

    try {
      // 2. Próba ataku: UserA próbuje rozwiązać wydarzenie
      await puppetProgram.methods.resolveEvent(
        new BN(eventId),
        nameTeamA,
      ).accounts({
        // UWAGA: Tu wstawiamy "oszusta". 
        // Gdybyśmy zostawili tu authority.publicKey, a podpisali userA,
        // błąd wyrzuciłby klient RPC (brak podpisu), a nie smart kontrakt.
        // My chcemy sprawdzić, czy kontrakt odrzuci UserA jako authority.
        authority: userA.publicKey,

        eventAccount: eventPda,
        vaultAccount: vaultPda,
        systemProgram: SystemProgram.programId,
      }).signers([userA]).rpc(); // Podpisuje UserA

      // Jeśli transakcja przejdzie, to znaczy, że każdy może zakończyć wydarzenie -> BŁĄD
      throw new Error("KRYTYCZNY BŁĄD: Zwykły użytkownik zdołał rozwiązać wydarzenie!");
    } catch (error) {
      // 3. Analiza błędu
      // Oczekujemy błędu typu "Constraint" (np. adres się nie zgadza z zapisanym w state)
      // lub customowego błędu "Unauthorized".

      const errorString = JSON.stringify(error);
      const isConstraintError = errorString.includes("Constraint") || errorString.includes("A has_one constraint was violated");
      const isAnchorError = error.message && error.message.includes("AnchorError");

      // Sprawdzamy czy kod błędu sugeruje brak uprawnień
      // Może to być standardowy błąd Anchora (ConstraintAddress/ConstraintHasOne) 
      // lub Twój własny błąd z Rusta.
      if (isConstraintError || isAnchorError) {
   //     console.log("Test udany. Smart kontrakt odrzucił nieuprawnionego użytkownika.");
      } else {
        console.log("Test nieudany. Otrzymano nieoczekiwany błąd:");
        throw error;
      }
    }
  });

    it("Obstawianie po zakończeniu czasu (powinno się NIE udać)", async () => {
    // Ustawienie czasu po zakończeniu zakładów
    currentClock = await setClock(context, bettingEnd + 5);
    logClock(currentClock);

    try {
      await puppetProgram.methods.placeBet(
        new BN(eventId),
        nameTeamA,
        new BN(solToLamports(0.1)),
      ).accounts({
        player: userA.publicKey,
        eventAccount: eventPda,
        optionAccount: teamAPda,
        vaultAccount: vaultPda,
        betAccount: userABetPda, 
        systemProgram: SystemProgram.programId,
      }).signers([userA]).rpc();

      throw new Error("Powinno rzucić błąd BettingEnded!");
    } catch (error) {
      const expectedErrorMessage = "BettingEnded"; 
      if (error.error && error.error.errorCode && error.error.errorCode.code === expectedErrorMessage) {
        console.log("Prawidłowo zablokowano zakład po czasie.");
      } else {
        throw error;
      }
    }
});

  it("Kończenie wydarzenia", async () => {
    printBalance(context, "authority", authority.publicKey);
    printBalance(context, "Skarbiec", vaultPda);
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
      vaultAccount: vaultPda,
      systemProgram: SystemProgram.programId,
    }).signers([authority]).rpc();
    printBalance(context, "authority", authority.publicKey);
    printBalance(context, "Skarbiec", vaultPda);
  });

  it("Odbieranie nagród 1", async () => {
    printBalance(context, "authority", authority.publicKey);
    await puppetProgram.methods.claimReward(
      new BN(eventId),
    ).accounts({
      player: userA.publicKey,
      authority: authority.publicKey,
      vaultAccount: vaultPda,
      betAccount: userABetPda,
      eventAccount: eventPda,
      optionAccount: teamAPda,
      systemProgram: SystemProgram.programId,
    }).signers([userA]).rpc();

    await puppetProgram.methods.claimReward(
      new BN(eventId),
    ).accounts({
      player: userC.publicKey,
      authority: authority.publicKey,
      vaultAccount: vaultPda,
      betAccount: userCBetPda,
      eventAccount: eventPda,
      optionAccount: teamBPda,
      systemProgram: SystemProgram.programId,
    }).signers([userC]).rpc();
  });

  it("Próba podwójnego odebrania nagrody (Double Claim) - powinna się nie udać", async () => {
    console.log("--- Testowanie Double Claim dla UserA ---");

    try {
      // Próbujemy wywołać claimReward DRUGI RAZ dla tego samego użytkownika (UserA),
      // który odebrał nagrodę w poprzednim teście.
      await puppetProgram.methods.claimReward(
        new BN(eventId),
      ).accounts({
        player: userA.publicKey,
        authority: authority.publicKey,
        vaultAccount: vaultPda,
        betAccount: userABetPda, // To konto jest kluczowe
        eventAccount: eventPda,
        optionAccount: teamAPda,
        systemProgram: SystemProgram.programId,
      }).signers([userA]).rpc();

      // Jeśli transakcja przejdzie bez błędu, rzucamy wyjątek, bo test ma upaść
      throw new Error("KRYTYCZNY BŁĄD: Pozwolono na podwójne odebranie nagrody!");
    } catch (error) {
      // Logujemy błąd, aby zobaczyć co się stało
       console.log("Złapany błąd (to dobrze):", error);

      // SCENARIUSZ A: Jeśli kontrakt zamyka konto zakładu po wypłacie (close = user)
      // Anchor rzuci błąd związany z tym, że konto nie istnieje lub nie zostało zainicjalizowane.
      const isAccountClosedError = JSON.stringify(error).includes("AccountNotInitialized") || 
                                   error.message.includes("Account does not exist");

      // SCENARIUSZ B: Jeślikontrakt rzuca customowy błąd (np. AlreadyClaimed)
      const expectedCustomError = "RewardAlreadyClaimed"; 
      const isCustomError = error.error && error.error.errorCode && error.error.errorCode.code === expectedCustomError;

      if (isAccountClosedError) {
        console.log("Test udany. Druga wypłata niemożliwa - konto zakładu zostało już zamknięte.");
      } else if (isCustomError) {
        console.log(`Test udany. Druga wypłata niemożliwa - złapano błąd logiczny: ${expectedCustomError}`);
      } else {
        // Jeśli to inny błąd (np. brak środków w skarbcu, błąd sygnatury), rzucamy go dalej
        console.log("Test nieudany. Otrzymano nieoczekiwany błąd:");
        throw error;
      }
    }
  });

  it("Odbieranie nagród 2 - zamykanie skarbca", async () => {
    printBalance(context, "authority", authority.publicKey);
    
    await puppetProgram.methods.claimReward(
      new BN(eventId),
    ).accounts({
      player: userB.publicKey,
      authority: authority.publicKey,
      vaultAccount: vaultPda,
      betAccount: userBBetPda,
      eventAccount: eventPda,
      optionAccount: teamAPda,
      systemProgram: SystemProgram.programId,
    }).signers([userB]).rpc();
    printBalance(context, "authority", authority.publicKey);
  });
});

