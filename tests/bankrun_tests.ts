import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Betting } from "../target/types/betting";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { AccountInfo, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Clock, start } from "solana-bankrun";

const IDL = require("../target/idl/betting.json");

describe("testyy", () => {
  // ZMIENNE GLOBALNE DLA TESTU
  let context;
  let provider;
  let puppetProgram;

  let client;
  let currentClock;

  let eventId = 1;
  let eventIdBN = new BN(eventId);
  let bettingStart = 1700000000;
  let bettingEnd = 1700010000;
  let eventName = "Nazwa testowego wydarzenia";
  let eventDescription = "Opis testowego wydarzenia";
  let nameTeamA = "Team A";
  let nameTeamB = "Team B";

  let eventPda;
  let vaultPda;
  let teamAPda;
  let teamBPda;
  let userABetPda;

  let authority;
  let userA;
  let userB;
  let userC;

  before("initialization", async () => {

    // Generowanie kluczy
    authority = Keypair.generate();
    userA = Keypair.generate();
    userB = Keypair.generate();
    userC = Keypair.generate();

    const accounts = [authority, userA, userB, userC].map(user => ({
      address: user.publicKey,
      info: {
        lamports: 9_000_000_000_000,      // każdy użytkownik dostaje np. 0.002 SOL
        data: Buffer.alloc(0),    // puste konto
        owner: SystemProgram.programId,
        executable: false,
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


    context = await startAnchor("../betting", [], accounts);
    provider = new BankrunProvider(context);

    puppetProgram = new Program<Betting>(IDL, provider);



    console.log("Wallet key: ", provider.wallet.publicKey.toBase58());
    console.log("authority publicKey: ", authority.publicKey.toBase58());
    console.log("userA publicKey: ", userA.publicKey.toBase58());
    console.log("userB publicKey: ", userB.publicKey.toBase58());
    console.log("userC publicKey: ", userC.publicKey.toBase58());
    const balance = await context.banksClient.getBalance(userA.publicKey);
    console.log("UserA lamports:", balance);
    console.log("UserA SOL:", Number(balance) / 1_000_000_000);




    // PDA
    [eventPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("event_seed"), new BN(eventId).toArrayLike(Buffer, "le", 8)],
      puppetProgram.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), new BN(eventId).toArrayLike(Buffer, "le", 8)],
      puppetProgram.programId
    );

    [teamAPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_seed"), new BN(eventId).toArrayLike(Buffer, "le", 8), Buffer.from("Team A")],
      puppetProgram.programId
    );

    [teamBPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("option_seed"), new BN(eventId).toArrayLike(Buffer, "le", 8), Buffer.from("Team B")],
      puppetProgram.programId
    );

    // seeds = [b"bet".as_ref(), player.key().as_ref(), _event_id.to_le_bytes().as_ref()],
    [userABetPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bet"), userA.publicKey.toBytes(), new BN(eventId).toArrayLike(Buffer, "le", 8)],
      puppetProgram.programId
    );

    // CLOCK
    client = context.banksClient;
    currentClock = await client.getClock();
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(bettingStart), //tuż przed zakończeniem głosowania: 1700009999 , równo zakończenie możliwości głosowania: 1700010000
      ),
    );
    currentClock = await client.getClock();
    console.log("Aktualny czas: ", currentClock.unixTimestamp);
  });

  // ctx: Context<InitializeEvent>, _event_id: u64, start_time: u64, end_time: u64, event_name: String, event_description: String
  //
  // pub authority: Signer<'info>, // admin bądź inna jednostka autoryzująca wydarzenie
  // pub event_account: Account<'info, EventAccount>,
  // pub vault_account: AccountInfo<'info>,
  // pub system_program: Program<'info, System>,
  it("Initialize event", async () => {
    currentClock = await client.getClock();
    console.log("Aktualny czas: ", currentClock.unixTimestamp);
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

  // ctx: Context<InitializeOptions>, _event_id: u64, option: String
  //
  // pub authority: Signer<'info>,
  // pub option_account: Account<'info, OptionAccount>,
  // pub event_account: Account<'info, EventAccount>,
  // pub system_program: Program<'info, System>,
  it("Initialize options", async () => {
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

  // ctx: Context<PlaceBet>, _event_id: u64, option: String, amount: u64
  //
  // pub player: Signer<'info>,
  // pub event_account: Account<'info, EventAccount>,
  // pub option_account: Account<'info, OptionAccount>,
  // pub vault_account: AccountInfo<'info>,
  // pub bet_account: Account<'info, BetAccount>,
  // pub system_program: Program<'info, System>,
  it("Place bet", async () => {
    let balance = await context.banksClient.getBalance(userA.publicKey);
    console.log("UserA lamports:", balance);
    console.log("UserA SOL:", Number(balance) / 1_000_000_000);
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(bettingStart + 50), //tuż przed zakończeniem głosowania: 1700009999 , równo zakończenie możliwości głosowania: 1700010000
      ),
    );
    currentClock = await client.getClock();
    console.log("Aktualny czas: ", currentClock.unixTimestamp);

    const betAmount = new BN(anchor.web3.LAMPORTS_PER_SOL); // Użyj 1 SOL

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
    console.log("Your transaction signature", vote1Tx);
    balance = await context.banksClient.getBalance(userA.publicKey);
    console.log("UserA lamports:", balance);
    console.log("UserA SOL:", Number(balance) / 1_000_000_000);
  });

  // ctx: Context<ResolveEvent>, _event_id: u64
  //
  // pub authority: Signer<'info>,
  // pub event_account: Account<'info, EventAccount>,
  // pub system_program: Program<'info, System>,
  it("Resolve event", async () => {
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

  // ctx: Context<ClaimReward>, _event_id: u64
  //
  // pub player: Signer<'info>,
  // pub vault_account: AccountInfo<'info>,
  // pub bet_account: Account<'info, BetAccount>,
  // pub event_account: Account<'info, EventAccount>,
  // pub option_account: Account<'info, OptionAccount>,
  // pub system_program: Program<'info, System>,
  it("Claim reward", async () => {
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
  });
});

