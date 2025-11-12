import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Betting } from "../target/types/betting";
import { PublicKey } from '@solana/web3.js';

describe("Betting", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Betting as Program<Betting>;

  const [eventAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("event_seed"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  it("InitializeEvent", async () => {
    // event_id: u64,
    // start_time: u64,
    // end_time: u64,
    // event_name: String,
    // event_description: String,
    const tx = await program.methods.initializeEvent(
      new anchor.BN(1),
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

});
