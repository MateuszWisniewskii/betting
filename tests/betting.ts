import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Betting } from "../target/types/betting";
import { PublicKey } from '@solana/web3.js';

describe("Betting", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Betting as Program<Betting>;

  const event_id = new anchor.BN(1);

  const [eventAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event_seed"), event_id.toArrayLike(Buffer, "le", 8)],
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
    ).rpc();

    console.log("Your transaction signature", tx);

    const eventAccount = await program.account.eventAccount.fetch(eventAddress);

    console.log("Event name: ", eventAccount.eventName);
    console.log("Event description: ", eventAccount.eventDescription);
    console.log("Betting start: ", eventAccount.bettingStart);
    console.log("Betting end: ", eventAccount.bettingEnd);
    console.log("Betting options index", eventAccount.bettingOptionsIndex);
    console.log("Event Resolved: ", eventAccount.eventResolved);
  });

  it("Initialize Options", async () => {
    // _event_id: u64, option: String
    const teamATx1 = await program.methods.initializeOptions(
      event_id,
      "Team A"
    ).accounts({
      eventAccount: eventAddress
    }).rpc();

    console.log("Your transaction signature", teamATx1);

    const TeamBTx2 = await program.methods.initializeOptions(
      event_id,
      "Team B"
    ).accounts({
      eventAccount: eventAddress
    }).rpc();

    console.log("Your transaction signature", TeamBTx2);

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
    // _event_id: u64, option: String
    const vote1Tx = await program.methods.placeBet(
      event_id,
      "Team A"
    ).rpc();

    console.log("Your transaction signature", vote1Tx);

    let teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
    console.log("Option name: ", teamAAccount.optionName);
    console.log("Option votes: ", teamAAccount.optionVotes);

    let teamBAccount = await program.account.optionAccount.fetch(teamBAdress);
    console.log("Option name: ", teamBAccount.optionName);
    console.log("Option votes: ", teamBAccount.optionVotes);

    const vote2Tx = await program.methods.placeBet(
      event_id,
      "Team A"
    ).rpc();
    const vote3Tx = await program.methods.placeBet(
      event_id,
      "Team B"
    ).rpc();
    const vote4Tx = await program.methods.placeBet(
      event_id,
      "Team A"
    ).rpc();

    console.log("Your transaction signature", vote2Tx);
    console.log("Your transaction signature", vote3Tx);
    console.log("Your transaction signature", vote4Tx);

    teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
    console.log("Option name: ", teamAAccount.optionName);
    console.log("Option votes: ", teamAAccount.optionVotes);

    teamBAccount = await program.account.optionAccount.fetch(teamBAdress);
    console.log("Option name: ", teamBAccount.optionName);
    console.log("Option votes: ", teamBAccount.optionVotes);
  });
});
