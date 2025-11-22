import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Betting } from "../target/types/betting";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
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

  before("initialization", async () => {
    context = await startAnchor("../betting", [], []);
    provider = new BankrunProvider(context);

    puppetProgram = new Program<Betting>(IDL, provider);

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

    // CLOCK
    client = context.banksClient;
    currentClock = await client.getClock();
  });

  it("Initialize event", async () => {
    await puppetProgram.methods.initializeEvent(
      new BN(eventId),
      new BN(bettingStart),
      new BN(bettingEnd),
      eventName,
      eventDescription,
    ).accounts({
      authority: provider.wallet.publicKey,
      eventAccount: eventPda,
      vaultAccount: vaultPda,
      systemProgram: SystemProgram.programId
    }).rpc();
  });

  it("Initialize options", async () => {
    await puppetProgram.methods.initializeOptions(
      new BN(eventId),
      nameTeamA,
    ).accounts({
      authority: provider.wallet.publicKey,
      optionAccount: teamAPda,
      eventAccount: eventPda,
      systemProgram: SystemProgram.programId,
    }).rpc();

    await puppetProgram.methods.initializeOptions(
      new BN(eventId),
      nameTeamB,
    ).accounts({
      authority: provider.wallet.publicKey,
      optionAccount: teamBPda,
      eventAccount: eventPda,
      systemProgram: SystemProgram.programId,
    }).rpc();
  });

  it("Resolve event", async () => {
    context.setClock(
      new Clock(
        currentClock.slot,
        currentClock.epochStartTimestamp,
        currentClock.epoch,
        currentClock.leaderScheduleEpoch,
        BigInt(1700010000), //tuż przed zakończeniem głosowania: 1700009999 , równo zakończenie możliwości głosowania: 1700010000
      ),
    );
    currentClock = await client.getClock();
    console.log("Aktualny czas: ", currentClock.unixTimestamp);

    await puppetProgram.methods.resolveEvent(
      new BN(eventId),
    ).accounts({
      authority: provider.wallet.publicKey,
      eventAccount: eventPda,
      systemProgram: SystemProgram.programId,
    }).rpc();
  });
});

