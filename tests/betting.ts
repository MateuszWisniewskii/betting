// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { Betting } from "../target/types/betting";
// import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';

// describe("Betting", () => {
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider); // ważne
//   const program = anchor.workspace.Betting as Program<Betting>;

//   const event_id = new anchor.BN(1);
//   const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL

//   // Obliczenia PDA
//   const [eventAccount] = PublicKey.findProgramAddressSync(
//     [Buffer.from("event_seed"), event_id.toArrayLike(Buffer, "le", 8)],
//     program.programId
//   );

//   const [vaultAddress] = PublicKey.findProgramAddressSync(
//     [Buffer.from("vault"), event_id.toArrayLike(Buffer, "le", 8)],
//     program.programId
//   );

//   const [teamAAdress] = PublicKey.findProgramAddressSync(
//     [Buffer.from("option_seed"), event_id.toArrayLike(Buffer, "le", 8), Buffer.from("Team A")],
//     program.programId
//   );

//   const [teamBAdress] = PublicKey.findProgramAddressSync(
//     [Buffer.from("option_seed"), event_id.toArrayLike(Buffer, "le", 8), Buffer.from("Team B")],
//     program.programId
//   );

//   const authority = Keypair.generate();
//   const userA = Keypair.generate();
//   const userB = Keypair.generate();
//   const userC = Keypair.generate();

//   console.log("authority publicKey: ", authority.publicKey.toBase58());
//   console.log("userA publicKey: ", userA.publicKey.toBase58());
//   console.log("userB publicKey: ", userB.publicKey.toBase58());
//   console.log("userC publicKey: ", userC.publicKey.toBase58());

//   // Fundujemy authority (await!)
//   before(async () => {
//     const sig = await provider.connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
//     await provider.connection.confirmTransaction(sig, "confirmed");
//   });

//   // const now = Math.floor(Date.now() / 1000);

//  provider.connection.setClock(
//     new anchor.web3.Clock({
//         unixTimestamp: new anchor.BN(2000000000) // własny timestamp
//     })
// );


//   it("Initialize Event", async () => {
//     // Wywołanie inicjalizacji eventu — nazwy kont muszą pasować do Rust (eventAccount, vaultAccount)
//     await setMockTime(1700005000);
//     const tx = await program.methods.initializeEvent(
//       event_id,
//       new anchor.BN(1700005000),
//       new anchor.BN(1700005000 + 1000),
//       "test event",
//       "description of test event"
//     ).accounts({
//       authority: authority.publicKey,     // publicKey, nie secretKey
//       eventAccount,                        // nazwa zgodna z Rust: event_account -> eventAccount w IDL
//       vaultAccount: vaultAddress,          // nazwa zgodna z Rust: vault_account -> vaultAccount
//       systemProgram: SystemProgram.programId
//     }).signers([authority]).rpc();

//     console.log("initializeEvent tx:", tx);

//     // fetch i weryfikacja
//     const eventAcc = await program.account.eventAccount.fetch(eventAccount);
//     console.log("Event name:", eventAcc.eventName);
//   });

//   it("Initialize Options", async () => {
//     // Opcja Team A
//     const teamATx1 = await program.methods.initializeOptions(
//       event_id,
//       "Team A"
//     ).accounts({
//       authority: authority.publicKey,
//       optionAccount: teamAAdress,  // opcja musi być przypisana do pola optionAccount
//       eventAccount,
//       systemProgram: SystemProgram.programId
//     }).signers([authority]).rpc();

//     console.log("initializeOptions Team A tx:", teamATx1);

//     // Opcja Team B
//     const teamBTx2 = await program.methods.initializeOptions(
//       event_id,
//       "Team B"
//     ).accounts({
//       authority: authority.publicKey,
//       optionAccount: teamBAdress,
//       eventAccount,
//       systemProgram: SystemProgram.programId
//     }).signers([authority]).rpc();

//     console.log("initializeOptions Team B tx:", teamBTx2);

//     // fetch i weryfikacja
//     const teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
//     console.log("Option A name:", teamAAccount.optionName);
//     console.log("Option A votes:", teamAAccount.optionVotes.toString());

//     const teamBAccount = await program.account.optionAccount.fetch(teamBAdress);
//     console.log("Option B name:", teamBAccount.optionName);
//     console.log("Option B votes:", teamBAccount.optionVotes.toString());
//   });

//   it("Place bet", async () => {
//     await setMockTime(1700005000 + 200);
//     // airdropy dla graczy — await!
//     const sig1 = await provider.connection.requestAirdrop(userA.publicKey, 1 * LAMPORTS_PER_SOL);
//     await provider.connection.confirmTransaction(sig1, "confirmed");
//     const sig2 = await provider.connection.requestAirdrop(userB.publicKey, 1 * LAMPORTS_PER_SOL);
//     await provider.connection.confirmTransaction(sig2, "confirmed");
//     const sig3 = await provider.connection.requestAirdrop(userC.publicKey, 1 * LAMPORTS_PER_SOL);
//     await provider.connection.confirmTransaction(sig3, "confirmed");

//     // Wywołanie placeBet — używamy poprawnych nazw kont i eventAccount (zmienna istnieje)
//     const vote1Tx = await program.methods.placeBet(
//       event_id,
//       "Team A",
//       betAmount
//     ).accounts({
//       player: userA.publicKey,
//       eventAccount,             // poprawna zmienna
//       optionAccount: teamAAdress,
//       vaultAccount: vaultAddress,
//       systemProgram: SystemProgram.programId
//     }).signers([userA]).rpc();

//     console.log("placeBet tx:", vote1Tx);

//     const teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
//     console.log("Option A pool (lamports):", teamAAccount.optionPool.toString());
//     console.log("Option A pool (SOL):", teamAAccount.optionPool.toNumber() / LAMPORTS_PER_SOL);
//   });

//   it("Double bet placing", async () => {
//     const sig1 = await provider.connection.requestAirdrop(userA.publicKey, 1 * LAMPORTS_PER_SOL);
//     await provider.connection.confirmTransaction(sig1, "confirmed");

//     // Wywołanie placeBet — używamy poprawnych nazw kont i eventAccount (zmienna istnieje)

//     try {
//       const votedoubleTx = await program.methods.placeBet(
//         event_id,
//         "Team A",
//         betAmount
//       ).accounts({
//         player: userA.publicKey,
//         eventAccount,             // poprawna zmienna
//         optionAccount: teamAAdress,
//         vaultAccount: vaultAddress,
//         systemProgram: SystemProgram.programId
//       }).signers([userA]).rpc();
//     } catch (err: any) {
//     }

//     const teamAAccount = await program.account.optionAccount.fetch(teamAAdress);
//     console.log("Option A pool (lamports):", teamAAccount.optionPool.toString());
//     console.log("Option A pool (SOL):", teamAAccount.optionPool.toNumber() / LAMPORTS_PER_SOL);
//   });

//   it("Resolve event", async () => {
//     const afterEnd = 1700005000 + 5000;

//     await setMockTime(afterEnd);
//     try {
//       let resolveTx = program.methods.resolveEvent(
//         event_id
//       ).accounts({
//         authority,
//         eventAccount,
//         systemProgram: SystemProgram.programId
//       }).signers([authority]).rpc();
//     } catch (err: any) { }

//     const eventAcc = await program.account.eventAccount.fetch(eventAccount);
//     console.log("Event name:", eventAcc.eventName);
//     console.log("Event Resolved?: ", eventAcc.eventResolved);

//     console.log("Mock time: ", afterEnd);
//     console.log("Event betting_end:", eventAcc.bettingEnd.toString());

//     if (!eventAcc.eventResolved) {
//       throw new Error("Event should be resolved but is NOT!");
//     }
//   });
//   //
// });
