import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Betting } from "../target/types/betting";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';

describe("Betting", () => {
  //anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.Betting as Program<Betting>;

  const event_id = new anchor.BN(1);

  const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL

  const [eventAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("event_seed"), event_id.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [vaultAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), event_id.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [teamAAdress] = PublicKey.findProgramAddressSync(
    [Buffer.from("option_seed"), event_id.toArrayLike(Buffer, "le", 8), Buffer.from("Team A")],
    program.programId
  );

  const [teamBAdress] = PublicKey.findProgramAddressSync(
    [Buffer.from("option_seed"), event_id.toArrayLike(Buffer, "le", 8), Buffer.from("Team B")],
    program.programId
  );

  const authority = Keypair.generate();
  const userA = Keypair.generate();
  const userB = Keypair.generate();
  const userC = Keypair.generate();
  console.log("authority publicKey: ", authority.publicKey);
  console.log("userA publicKey: ", userA.publicKey);
  console.log("userB publicKey: ", userB.publicKey);
  console.log("userC publicKey: ", userC.publicKey);

  provider.connection.requestAirdrop(authority.publicKey, 1_000_000_000);

  // it("airdrop test", async () => {
  //   await provider.connection.requestAirdrop(userA.publicKey, 1_000_000_000);
  //   await provider.connection.requestAirdrop(userB.publicKey, 1_000_000_000);
  //   await provider.connection.requestAirdrop(userC.publicKey, 1_000_000_000);
  // });


  it("Initialize Event", async () => {
    // event_id: u64,
    // start_time: u64,
    // end_time: u64,
    // event_name: String,
    // event_description: String,
    const tx = await program.methods.initializeEvent(
      event_id,
      new anchor.BN(0),
      new anchor.BN(1862962253),
      "test event",
      "description of test event"
    ).accounts({
      authority: authority.secretKey,
      eventAccount,
      vaultAddress,
      systemProgram: SystemProgram.programId
    }).signers([authority]);

    // console.log("Your transaction signature", tx);

    // const eventAccount = await program.account.eventAccount.fetch(eventAddress);

    // console.log("Event name: ", eventAccount.eventName);
    // console.log("Event description: ", eventAccount.eventDescription);
    // console.log("Betting start: ", eventAccount.bettingStart);
    // console.log("Betting end: ", eventAccount.bettingEnd);
    // console.log("Betting options index", eventAccount.bettingOptionsIndex);
    // console.log("Event Resolved: ", eventAccount.eventResolved);
  });

  it("Initialize Options", async () => {
    // _event_id: u64, option: String
    const teamATx1 = await program.methods.initializeOptions(
      event_id,
      "Team A"
    ).accounts({
      authority: authority.publicKey,
      optionAccount: teamAAdress,
      eventAccount,
      systemProgram: SystemProgram.programId
    }).signers([authority]);

    // console.log("Your transaction signature", teamATx1);

    const TeamBTx2 = await program.methods.initializeOptions(
      event_id,
      "Team B"
    ).accounts({
      authority: authority.publicKey,
      optionAccount: teamBAdress,
      eventAccount,
      systemProgram: SystemProgram.programId
    }).signers([authority]);

    // console.log("Your transaction signature", TeamBTx2);

    // const eventAccount = await program.account.eventAccount.fetch(eventAddress);

    // console.log("Event name: ", eventAccount.eventName);
    // console.log("Event description: ", eventAccount.eventDescription);
    // console.log("Betting start: ", eventAccount.bettingStart);
    // console.log("Betting end: ", eventAccount.bettingEnd);
    // console.log("Betting options index", eventAccount.bettingOptionsIndex);
    // console.log("Event Resolved: ", eventAccount.eventResolved);

    const teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
    console.log("Option name: ", teamAAccount.optionName);
    console.log("Option votes: ", teamAAccount.optionVotes);

    const teamBAccount = await program.account.optionAccount.fetch(teamBAdress);
    console.log("Option name: ", teamBAccount.optionName);
    console.log("Option votes: ", teamBAccount.optionVotes);
  });

  it("Place bet", async () => {
        await provider.connection.requestAirdrop(userA.publicKey, 1_000_000_000);
    await provider.connection.requestAirdrop(userB.publicKey, 1_000_000_000);
    await provider.connection.requestAirdrop(userC.publicKey, 1_000_000_000);
 
    // _event_id: u64, option: String, amount: u64
    const vote1Tx = await program.methods.placeBet(
      event_id,
      "Team A",
      betAmount,
    ).accounts({
  player: userA.publicKey,            // <- WYMAGANE
  eventAccount: eventAddress,       // <- WYMAGANE
  optionAccount: teamAAdress,       // <- WYMAGANE
  vaultAccount: vaultAddress,       // <- WYMAGANE
  systemProgram: SystemProgram.programId,
}).signers([userA]).rpc();

    console.log("Your transaction signature", vote1Tx);

    let teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
    console.log("Option name: ", teamAAccount.optionName);
    console.log("Option votes: ", teamAAccount.optionVotes);
    console.log("Option total pool: ", teamAAccount.optionPool.toString());
    console.log("Option total pool (SOL): ", teamAAccount.optionPool.toNumber() / LAMPORTS_PER_SOL);

    let teamBAccount = await program.account.optionAccount.fetch(teamBAdress);
    console.log("Option name: ", teamBAccount.optionName);
    console.log("Option votes: ", teamBAccount.optionVotes);
    console.log("Option total pool (lamports): ", teamBAccount.optionPool.toString());
    console.log("Option total pool (SOL): ", teamBAccount.optionPool.toNumber() / LAMPORTS_PER_SOL);

    // const vote2Tx = await program.methods.placeBet(
    //   event_id,
    //   "Team A",
    //   betAmount,
    // ).signers([userB]).rpc();
    // const vote3Tx = await program.methods.placeBet(
    //   event_id,
    //   "Team B",
    //   betAmount,
    // ).signers([userA]).rpc();
    // const vote4Tx = await program.methods.placeBet(
    //   event_id,
    //   "Team A",
    //   betAmount,
    // ).signers([userC]).rpc();

    // console.log("Your transaction signature", vote2Tx);
    // console.log("Your transaction signature", vote3Tx);
    // console.log("Your transaction signature", vote4Tx);

    // teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
    // console.log("Option name: ", teamAAccount.optionName);
    // console.log("Option votes: ", teamAAccount.optionVotes);
    // console.log("Option total pool (lamports): ", teamAAccount.optionPool.toString());
    // console.log("Option total pool (SOL): ", teamAAccount.optionPool.toNumber() / LAMPORTS_PER_SOL);

    // teamBAccount = await program.account.optionAccount.fetch(teamBAdress);
    // console.log("Option name: ", teamBAccount.optionName);
    // console.log("Option votes: ", teamBAccount.optionVotes);
    // console.log("Option total pool (lamports): ", teamBAccount.optionPool.toString());
    // console.log("Option total pool (SOL): ", teamBAccount.optionPool.toNumber() / LAMPORTS_PER_SOL);
  });
});
